import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { GoogleAuthService } from './google-auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('v1/auth/google')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Get()
  async getGlobalAuthUrl(@Res() res: Response) {
    // Legacy global auth route
    const url = await this.googleAuthService.generateGlobalAuthUrl();
    res.redirect(url);
  }

  @Get('department')
  @UseGuards(JwtAuthGuard) // Require login to connect Google Account
  async getDepartmentAuthUrl(
    @Query('departmentId') departmentId: string, 
    @Req() req: any, 
    @Res() res: Response
  ) {
    if (!departmentId) {
      throw new HttpException('departmentId is required', HttpStatus.BAD_REQUEST);
    }
    
    // Pass userId and departmentId to securely generate state
    const url = await this.googleAuthService.generateAuthUrl(req.user.userId, departmentId);
    // Redirect the user to Google's consent screen
    res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string, 
    @Query('state') state: string,
    @Res() res: Response
  ) {
    if (!code) {
      throw new HttpException('No code provided', HttpStatus.BAD_REQUEST);
    }

    try {
      if (state) {
        // New multi-account flow with state
        await this.googleAuthService.exchangeCodeForTokens(code, state);
      } else {
        // Legacy global flow
        await this.googleAuthService.exchangeCodeForGlobalTokens(code);
      }

      res.redirect('http://localhost:3000/admin/departments?googleAuth=success');
    } catch (error) {
      res.redirect('http://localhost:3000/admin/departments?googleAuth=error');
    }
  }
}
