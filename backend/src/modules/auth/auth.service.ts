import { Injectable, UnauthorizedException, NotFoundException, forwardRef, Inject, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { BlacklistedToken } from './schemas/blacklisted-token.schema';
import { GoogleAuthService } from './google-auth.service';
import { google } from 'googleapis';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(BlacklistedToken.name)
    private blacklistedTokenModel: Model<BlacklistedToken>,
    @Inject(forwardRef(() => GoogleAuthService))
    private googleAuthService: GoogleAuthService,
  ) {}

  async generateAndSendOtp(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiry

    // Save to user (using usersService.updateUser)
    await this.usersService.updateUser(user._id.toString(), {
      loginOtp: otp,
      loginOtpExpiresAt: expiresAt,
    });

    // Send OTP via Email using Nodemailer and App Password
    try {
      const smtpEmail = process.env.SMTP_EMAIL;
      const smtpPassword = process.env.SMTP_APP_PASSWORD;

      if (!smtpEmail || !smtpPassword) {
        console.error('SMTP credentials not configured in environment variables');
        throw new InternalServerErrorException('SMTP credentials not configured. Please add SMTP_EMAIL and SMTP_APP_PASSWORD to the server .env file.');
      }

      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpEmail,
          pass: smtpPassword,
        },
      });

      const mailOptions = {
        from: `"Support" <${smtpEmail}>`,
        to: email,
        subject: 'Your Login OTP',
        text: `Your login OTP code is: ${otp}\n\nIt will expire in 5 minutes.`,
      };

      await transporter.sendMail(mailOptions);
    } catch (e: any) {
      console.error('Failed to send OTP email via Nodemailer', e);
      if (e instanceof InternalServerErrorException) {
        throw e;
      }
      throw new InternalServerErrorException(`Could not send OTP email: ${e.message}`);
    }
  }

  async verifyOtp(email: string, otp: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or OTP');
    }

    if (!user.loginOtp || user.loginOtp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (!user.loginOtpExpiresAt || new Date() > new Date(user.loginOtpExpiresAt)) {
      throw new UnauthorizedException('OTP has expired');
    }

    // Clear the OTP
    await this.usersService.updateUser(user._id.toString(), {
      loginOtp: null,
      loginOtpExpiresAt: null,
    });

    const { passwordHash, ...result } = (user as any).toObject();
    return result;
  }

  async login(user: any) {
    const payload = {
      sub: user._id,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.roleId?.name,
        departmentId: user.departmentId?._id || user.departmentId,
      },
    };
  }

  async blacklistToken(token: string) {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (decoded && decoded.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        await new this.blacklistedTokenModel({ token, expiresAt }).save();
      }
    } catch (err) {
      // Ignore if token is invalid or already expired/blacklisted
    }
  }
}
