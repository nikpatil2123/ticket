import { Controller, Get, Query, Res, Req, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { GoogleAuthService } from './google-auth.service';

@Controller('v1/auth/google')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Get()
  async getAuthUrl(@Res() res: Response) {
    const url = this.googleAuthService.generateAuthUrl();
    // Redirect the user to Google's consent screen
    res.redirect(url);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      throw new HttpException('No code provided', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const tokens = await this.googleAuthService.exchangeCodeForTokens(code);
      
      // In a real application, you would store these tokens against a specific
      // system settings record (e.g., 'helpdesk-email-settings') in MongoDB.
      
      // For now, redirect back to the frontend with success
      res.redirect('http://localhost:3000/admin/departments?googleAuth=success');
    } catch (error) {
      res.redirect('http://localhost:3000/admin/departments?googleAuth=error');
    }
  }
}
