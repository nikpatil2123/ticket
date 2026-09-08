import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { IsEmail, IsString, MinLength } from 'class-validator';

class SendOtpDto {
  @IsEmail()
  email: string;
}

class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  otp: string;
}

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async sendOtp(@Body() body: SendOtpDto) {
    await this.authService.generateAndSendOtp(body.email);
    return { success: true, message: 'OTP sent successfully to your email.' };
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async verifyOtp(@Body() body: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const { email, otp } = body;
    const user = await this.authService.verifyOtp(email, otp);
    
    const data = await this.authService.login(user);
    
    res.cookie('token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    return data;
  }

  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    if (req.cookies && req.cookies['token']) {
      await this.authService.blacklistToken(req.cookies['token']);
    }
    res.clearCookie('token');
    return { success: true };
  }
}
