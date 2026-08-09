import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { GoogleAuthController } from './google-auth.controller';
import { GoogleAuthService } from './google-auth.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import {
  SystemSettings,
  SystemSettingsSchema,
} from './schemas/system-settings.schema';
import { UsersModule } from '../users/users.module';
import {
  BlacklistedToken,
  BlacklistedTokenSchema,
} from './schemas/blacklisted-token.schema';

import {
  OAuthState,
  OAuthStateSchema,
} from './schemas/oauth-state.schema';
import {
  GmailConnection,
  GmailConnectionSchema,
} from '../email/schemas/gmail-connection.schema';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: SystemSettings.name, schema: SystemSettingsSchema },
      { name: BlacklistedToken.name, schema: BlacklistedTokenSchema },
      { name: OAuthState.name, schema: OAuthStateSchema },
      { name: GmailConnection.name, schema: GmailConnectionSchema },
    ]),
  ],
  controllers: [GoogleAuthController, AuthController],
  providers: [GoogleAuthService, AuthService, JwtStrategy],
  exports: [GoogleAuthService, AuthService, MongooseModule],
})
export class AuthModule {}
