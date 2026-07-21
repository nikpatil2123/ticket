import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { google } from 'googleapis';
import { SystemSettings } from './schemas/system-settings.schema';

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private oauth2Client;

  constructor(
    private configService: ConfigService,
    @InjectModel(SystemSettings.name) private settingsModel: Model<SystemSettings>
  ) {
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    const redirectUri = this.configService.get<string>('google.redirectUri');

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request a refresh token
      prompt: 'consent', // Force consent to get refresh token every time during dev
      scope: scopes,
    });
  }

  async exchangeCodeForTokens(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.logger.log('Successfully exchanged code for Google OAuth tokens');
    
    // Save tokens securely in DB
    await this.settingsModel.findOneAndUpdate(
      { key: 'google_oauth_tokens' },
      { $set: { value: tokens } },
      { upsert: true, returnDocument: 'after' }
    );
    this.logger.log('Tokens saved to database');
    return tokens;
  }
  
  async getAuthClient() {
    const settings = await this.settingsModel.findOne({ key: 'google_oauth_tokens' });
    if (!settings || !settings.value) {
      throw new Error('Google OAuth tokens not found in database. User must connect Google Workspace.');
    }
    this.oauth2Client.setCredentials(settings.value);
    return this.oauth2Client;
  }
}
