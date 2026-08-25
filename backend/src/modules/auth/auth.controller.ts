import { Controller, Post, Body, UnauthorizedException, Res, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { IsEmail, IsString, MinLength } from 'class-validator';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { email, password } = body;
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
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
