import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('v1/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    // This responds quickly with 200 OK to acknowledge receipt to Pub/Sub
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
