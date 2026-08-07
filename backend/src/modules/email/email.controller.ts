import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    await this.emailService.handleWebhook(payload);
    return { status: 'received' };
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncEmails() {
    await this.emailService.syncEmails();
    return { status: 'sync_completed' };
  }
}
