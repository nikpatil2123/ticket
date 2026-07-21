import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { google } from 'googleapis';
import { GoogleAuthService } from '../auth/google-auth.service';
import { AiService } from '../ai/ai.service';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue('email-ingestion') private emailQueue: Queue,
    private readonly googleAuthService: GoogleAuthService,
    private readonly aiService: AiService,
    private readonly ticketsService: TicketsService
  ) {}

  onModuleInit() {
    this.logger.log('Starting 5-second automatic email polling worker...');
    setInterval(async () => {
      try {
        await this.syncEmails();
      } catch (error) {
        // Silently handle polling errors to keep loop running
      }
    }, 5000);
  }

  private cleanEmailBody(bodyText: string): string {
    if (!bodyText) return '';
    // Strip common email quote patterns like "On Mon, Jan 1 ... wrote:"
    let cleaned = bodyText.replace(/\s*On\s+[\s\S]*?wrote:[\s\S]*/gi, '');
    cleaned = cleaned.replace(/\s*---------- Forwarded message ---------[\s\S]*/gi, '');
    return cleaned.trim() || bodyText;
  }

  async handleWebhook(payload: any): Promise<void> {
    try {
      if (payload.message && payload.message.data) {
        const decodedData = Buffer.from(payload.message.data, 'base64').toString('utf-8');
        const parsedData = JSON.parse(decodedData);

        if (parsedData.historyId) {
          await this.emailQueue.add('fetch-history', { historyId: parsedData.historyId });
          this.logger.log(`Enqueued Gmail history sync for historyId: ${parsedData.historyId}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to parse webhook payload', error);
    }
  }

  async syncEmails(): Promise<void> {
    this.logger.log('Manually syncing unread emails from Gmail...');
    try {
      const auth = await this.googleAuthService.getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });

      // Fetch unread messages
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread -from:me',
        maxResults: 5
      });

      const messages = res.data.messages || [];
      if (messages.length === 0) {
        this.logger.log('No new unread emails found.');
        return;
      }

      this.logger.log(`Found ${messages.length} unread emails. Processing...`);

      for (const msg of messages) {
        if (!msg.id) continue;
        
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const messageData: any = msgRes.data;
        
        const headers: any[] = messageData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
        const messageId = headers.find((h: any) => h.name === 'Message-ID' || h.name === 'Message-Id')?.value;
        const threadId = messageData.threadId;
        
        // Extract basic body text and clean quoted history
        let rawBodyText = messageData.snippet || '';
        let bodyText = this.cleanEmailBody(rawBodyText);

        this.logger.log(`Processing email from: ${from} | Subject: ${subject}`);

        // Extract raw email address from "Name <email@address.com>"
        const emailRegex = /<([^>]+)>/;
        const customerEmail = emailRegex.test(from) ? from.match(emailRegex)[1] : from;

        // Check if a ticket already exists for this Gmail thread ID
        let existingTicket: any = null;
        if (threadId) {
          existingTicket = await this.ticketsService.findTicketByThreadId(threadId);
        }

        if (existingTicket) {
          this.logger.log(`Thread ID ${threadId} matches existing ticket TKT-${existingTicket.ticketNumber}. Appending reply...`);
          
          await this.ticketsService.addMessage(
            existingTicket._id.toString(),
            'INBOUND',
            customerEmail,
            ['support@acme.com'],
            subject,
            bodyText
          );

          await this.ticketsService.logActivity(
            existingTicket._id.toString(),
            null,
            'CUSTOMER_REPLY',
            {},
            'Customer sent a reply email'
          );

          this.logger.log(`Successfully appended customer reply to ticket ${existingTicket.ticketNumber}`);
        } else {
          // Classify with AI for new ticket creation
          const aiResult = await this.aiService.classifyEmail(subject, bodyText);

          const createdTicket = await this.ticketsService.createTicket({
            subject: subject,
            customerEmail: customerEmail,
            initialMessage: bodyText,
            aiClassification: aiResult,
            threadId: threadId,
            messageId: messageId
          });

          // Send auto-reply with ticket number
          try {
            await this.ticketsService.sendAutoReply((createdTicket as any)._id.toString(), this.googleAuthService);
            this.logger.log(`Sent auto-reply for ticket ${(createdTicket as any).ticketNumber}`);
          } catch (e) {
            this.logger.error('Failed to send auto-reply', e);
          }
        }

        // Mark as READ in Gmail
        await gmail.users.messages.modify({
          userId: 'me',
          id: msg.id,
          requestBody: {
            removeLabelIds: ['UNREAD']
          }
        });
        
        this.logger.log(`Successfully processed and created ticket for message ${msg.id}`);
      }

    } catch (error) {
      this.logger.error('Error during manual email sync', error);
      throw error;
    }
  }
}
