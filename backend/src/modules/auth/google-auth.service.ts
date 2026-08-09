import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { google } from 'googleapis';
import * as crypto from 'crypto';
import { OAuthState } from './schemas/oauth-state.schema';
import { SystemSettings } from './schemas/system-settings.schema';
import { GmailConnection, GmailConnectionStatus } from '../email/schemas/gmail-connection.schema';
import { encryptToken, decryptToken } from '../../utils/crypto.util';

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private oauth2Client;

  constructor(
    private configService: ConfigService,
    @InjectModel(SystemSettings.name) private settingsModel: Model<SystemSettings>,
    @InjectModel(OAuthState.name) private oauthStateModel: Model<OAuthState>,
    @InjectModel(GmailConnection.name) private gmailConnectionModel: Model<GmailConnection>,
  ) {
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    const redirectUri = this.configService.get<string>('google.redirectUri');

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );
  }

  async generateGlobalAuthUrl(): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/drive.file',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request a refresh token
      prompt: 'consent', // Force consent to get refresh token every time during dev
      scope: scopes,
    });
  }

  async exchangeCodeForGlobalTokens(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.logger.log('Successfully exchanged code for Global Google OAuth tokens');

    // Save tokens securely in DB
    await this.settingsModel.findOneAndUpdate(
      { key: 'google_oauth_tokens' },
      { $set: { value: tokens } },
      { upsert: true, returnDocument: 'after' },
    );
    this.logger.log('Global Tokens saved to database');
    return tokens;
  }

  async generateAuthUrl(userId: string, departmentId?: string, organizationId?: string): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ];

    const stateStr = crypto.randomBytes(32).toString('hex');
    
    // Expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.oauthStateModel.create({
      state: stateStr,
      userId,
      departmentId,
      organizationId,
      expiresAt,
    });

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request a refresh token
      prompt: 'consent', // Force consent to get refresh token every time during dev
      scope: scopes,
      state: stateStr,
    });
  }

  async exchangeCodeForTokens(code: string, stateStr: string): Promise<any> {
    const stateRecord = await this.oauthStateModel.findOne({ state: stateStr });
    if (!stateRecord) {
      throw new HttpException('Invalid or expired OAuth state', HttpStatus.BAD_REQUEST);
    }
    
    if (new Date() > stateRecord.expiresAt) {
      await this.oauthStateModel.deleteOne({ _id: stateRecord._id });
      throw new HttpException('OAuth state expired', HttpStatus.BAD_REQUEST);
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    this.logger.log('Successfully exchanged code for Google OAuth tokens');

    // Fetch user info from Google to get the email and googleUserId
    this.oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    if (!userInfo.data.email || !userInfo.data.id) {
      throw new HttpException('Could not retrieve email from Google', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not configured');
    }

    const encryptedAccessToken = encryptToken(tokens.access_token || '', encryptionKey);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token || '', encryptionKey);

    // Create or update Gmail Connection
    await this.gmailConnectionModel.findOneAndUpdate(
      { emailAddress: userInfo.data.email },
      {
        $set: {
          departmentId: stateRecord.departmentId,
          organizationId: stateRecord.organizationId,
          googleUserId: userInfo.data.id,
          encryptedAccessToken,
          ...(tokens.refresh_token ? { encryptedRefreshToken } : {}), // only update if provided
          tokenExpiry: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
          scopes: tokens.scope ? tokens.scope.split(' ') : [],
          isActive: true,
          status: GmailConnectionStatus.CONNECTED,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    
    this.logger.log(`Gmail connection saved for ${userInfo.data.email}`);
    
    // Clean up state
    await this.oauthStateModel.deleteOne({ _id: stateRecord._id });

    return tokens;
  }

  // Keep the old method working for verification (will be removed later)
  async getAuthClient() {
    const settings = await this.settingsModel.findOne({
      key: 'google_oauth_tokens',
    });
    if (!settings || !settings.value) {
      throw new Error(
        'Google OAuth tokens not found in database. User must connect Google Workspace.',
      );
    }
    this.oauth2Client.setCredentials(settings.value);
    return this.oauth2Client;
  }

  // New method to get a specific connection's client
  async getAuthClientForConnection(connectionId: string) {
    const connection = await this.gmailConnectionModel.findById(connectionId);
    if (!connection) {
      throw new Error(`GmailConnection ${connectionId} not found`);
    }

    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not configured');
    }

    const accessToken = decryptToken(connection.encryptedAccessToken, encryptionKey);
    const refreshToken = decryptToken(connection.encryptedRefreshToken, encryptionKey);

    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    const redirectUri = this.configService.get<string>('google.redirectUri');

    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: connection.tokenExpiry.getTime(),
    });

    // Handle automatic refresh when token expires
    client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        connection.encryptedRefreshToken = encryptToken(tokens.refresh_token, encryptionKey);
      }
      if (tokens.access_token) {
        connection.encryptedAccessToken = encryptToken(tokens.access_token, encryptionKey);
      }
      if (tokens.expiry_date) {
        connection.tokenExpiry = new Date(tokens.expiry_date);
      }
      connection.status = GmailConnectionStatus.CONNECTED;
      await connection.save();
      this.logger.log(`Refreshed tokens saved for ${connection.emailAddress}`);
    });

    return client;
  }
}
