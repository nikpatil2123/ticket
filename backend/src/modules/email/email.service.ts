import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { google } from 'googleapis';
import { GoogleAuthService } from '../auth/google-auth.service';
import { AiService } from '../ai/ai.service';
import { TicketsService } from '../tickets/tickets.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attachment } from './schemas/attachment.schema';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private timerHandle: any = null;

  constructor(
    @InjectQueue('email-ingestion') private emailQueue: Queue,
    private readonly googleAuthService: GoogleAuthService,
    private readonly aiService: AiService,
    private readonly ticketsService: TicketsService,
    private readonly configService: ConfigService,
    @InjectModel(Attachment.name) private attachmentModel: Model<Attachment>,
  ) {}

  private isSyncing = false;

  onModuleInit() {
    this.logger.log('Starting 5-second automatic email polling worker...');
    this.timerHandle = setInterval(async () => {
      if (this.isSyncing) return;
      this.isSyncing = true;
      try {
        await this.syncEmails();
      } catch (error) {
        // Silently handle polling errors to keep loop running
      } finally {
        this.isSyncing = false;
      }
    }, 5000);
  }

  onModuleDestroy() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.logger.log('Stopped automatic email polling worker.');
    }
  }

  private getAttachmentsFromParts(parts: any[]): any[] {
    const attachments: any[] = [];
    if (!parts) return attachments;
    for (const part of parts) {
      if (part.filename && part.body && part.body.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          attachmentId: part.body.attachmentId,
          size: part.body.size,
        });
      }
      if (part.parts) {
        attachments.push(...this.getAttachmentsFromParts(part.parts));
      }
    }
    return attachments;
  }

  private findHeaderRecursive(
    payload: any,
    headerName: string,
  ): string | undefined {
    if (!payload) return undefined;
    if (payload.headers && Array.isArray(payload.headers)) {
      const found = payload.headers.find(
        (h: any) => h.name && h.name.toLowerCase() === headerName.toLowerCase(),
      );
      if (found?.value) return found.value;
    }
    if (payload.parts && Array.isArray(payload.parts)) {
      for (const part of payload.parts) {
        const found = this.findHeaderRecursive(part, headerName);
        if (found) return found;
      }
    }
    return undefined;
  }

  private cleanEmailBody(bodyText: string): string {
    if (!bodyText) return '';
    // Strip common email quote patterns like "On Mon, Jan 1 ... wrote:"
    let cleaned = bodyText.replace(/\s*On\s+[\s\S]*?wrote:[\s\S]*/gi, '');
    cleaned = cleaned.replace(
      /\s*---------- Forwarded message ---------[\s\S]*/gi,
      '',
    );
    return cleaned.trim() || bodyText;
  }

  async handleWebhook(payload: any): Promise<void> {
    try {
      if (payload.message && payload.message.data) {
        const decodedData = Buffer.from(
          payload.message.data,
          'base64',
        ).toString('utf-8');
        const parsedData = JSON.parse(decodedData);

        if (parsedData.historyId) {
          await this.emailQueue.add('fetch-history', {
            historyId: parsedData.historyId,
          });
          this.logger.log(
            `Enqueued Gmail history sync for historyId: ${parsedData.historyId}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to parse webhook payload', error);
    }
  }

  private processedMessageIds: string[] = [];

  async syncEmails(): Promise<void> {
    this.logger.log('Manually syncing unread emails from Gmail...');
    try {
      const auth = await this.googleAuthService.getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });

      // Fetch unread messages
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread -from:me',
        maxResults: 5,
      });

      const messages = res.data.messages || [];
      if (messages.length === 0) {
        this.logger.log('No new unread emails found.');
        return;
      }

      this.logger.log(`Found ${messages.length} unread emails. Processing...`);

      for (const msg of messages) {
        if (!msg.id) continue;
        if (this.processedMessageIds.includes(msg.id)) {
          // Gmail index hasn't updated yet, skip
          continue;
        }

        this.processedMessageIds.push(msg.id);
        if (this.processedMessageIds.length > 1000) {
          this.processedMessageIds.shift();
        }

        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const messageData: any = msgRes.data;

        const subject =
          this.findHeaderRecursive(messageData.payload, 'Subject') || '(no subject)';
        const from =
          this.findHeaderRecursive(messageData.payload, 'From') || 'Unknown';
        const messageId = this.findHeaderRecursive(
          messageData.payload,
          'Message-ID',
        );
        const threadId = messageData.threadId;

        this.logger.log(
          `Parsed email -> ThreadId: ${threadId} | MessageID: ${messageId} | From: ${from} | Subject: ${subject}`,
        );

        // DB-backed deduplication check
        const existingById = await this.ticketsService.findMessageByMessageId(
          msg.id,
        );
        const existingByHeader = messageId
          ? await this.ticketsService.findMessageByMessageId(messageId)
          : null;
        if (existingById || existingByHeader) {
          this.logger.log(
            `Message ${msg.id} (Header: ${messageId}) already exists in DB. Skipping duplicate.`,
          );
          try {
            await gmail.users.messages.modify({
              userId: 'me',
              id: msg.id,
              requestBody: { removeLabelIds: ['UNREAD'] },
            });
          } catch (e) {
            // Ignore error if marking read fails
          }
          continue;
        }

        // Extract basic body text and clean quoted history
        const rawBodyText = messageData.snippet || '';
        const bodyText = this.cleanEmailBody(rawBodyText);

        this.logger.log(`Processing email from: ${from} | Subject: ${subject}`);

        // Extract raw email address from "Name <email@address.com>"
        const emailRegex = /<([^>]+)>/;
        const emailMatch = from ? from.match(emailRegex) : null;
        const customerEmail = emailMatch ? emailMatch[1] : from;

        // Check if a ticket already exists for this Gmail thread ID

        const parts = messageData.payload?.parts || [];
        const rawAttachments = this.getAttachmentsFromParts(parts);

        // Deduplicate attachments by attachmentId
        const uniqueAttachments: any[] = [];
        const seenAttIds = new Set<string>();
        for (const att of rawAttachments) {
          if (att.attachmentId && !seenAttIds.has(att.attachmentId)) {
            seenAttIds.add(att.attachmentId);
            uniqueAttachments.push(att);
          }
        }

        const folderId =
          this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID') || null;

        let existingTicket: any = null;
        if (threadId) {
          existingTicket =
            await this.ticketsService.findTicketByThreadId(threadId);
        }

        let createdMessage: any = null;

        if (existingTicket) {
          this.logger.log(
            `Thread ID ${threadId} matches existing ticket TKT-${existingTicket.ticketNumber}. Appending reply...`,
          );

          createdMessage = await this.ticketsService.addMessage(
            existingTicket._id.toString(),
            'INBOUND',
            customerEmail,
            ['support@acme.com'],
            subject,
            bodyText,
            messageId || msg.id,
          );

          await this.ticketsService.logActivity(
            existingTicket._id.toString(),
            null,
            'CUSTOMER_REPLY',
            {},
            'Customer sent a reply email',
          );

          this.logger.log(
            `Successfully appended customer reply to ticket ${existingTicket.ticketNumber}`,
          );
        } else {
          // Classify with AI for new ticket creation
          const aiResult = await this.aiService.classifyEmail(
            subject,
            bodyText,
          );

          // If AI did not map the email to a supported department, persist to inbox_entries and skip creating a ticket
          const supportedDepartments = ['SALARY', 'MIS_DETAILS_CHANGE', 'LEAVE', 'ATTENDANCE'];
          const intentName = aiResult?.intent || 'UNASSIGNED';

          if (!supportedDepartments.includes(intentName)) {
            this.logger.log(
              `Email from ${from} (${subject}) classified as '${intentName}' which is not a supported department. Saving to inbox_entries and skipping ticket creation.`,
            );

            try {
              const result = (await this.ticketsService.createTicket({
                subject: subject,
                customerEmail: customerEmail,
                initialMessage: bodyText,
                aiClassification: aiResult,
                threadId: threadId,
                messageId: messageId || msg.id,
              })) as any;

              // repository returns { inboxEntryId } when it saved to inbox_entries
              if (result && result.inboxEntryId) {
                this.logger.log(
                  `Saved email to inbox_entries with id ${result.inboxEntryId}`,
                );
              }
            } catch (e) {
              this.logger.error('Failed to persist inbox entry', e);
            }

            try {
              await gmail.users.messages.modify({
                userId: 'me',
                id: msg.id,
                requestBody: { removeLabelIds: ['UNREAD'] },
              });
            } catch (e) {
              // Ignore error if marking read fails
            }

            continue;
          }

          const result = (await this.ticketsService.createTicket({
            subject: subject,
            customerEmail: customerEmail,
            initialMessage: bodyText,
            aiClassification: aiResult,
            threadId: threadId,
            messageId: messageId || msg.id,
          })) as any;

          const createdTicket = result.ticket;
          createdMessage = result.message;

          // Send auto-reply with ticket number
          try {
            await this.ticketsService.sendAutoReply(
              createdTicket._id.toString(),
              this.googleAuthService,
            );
            this.logger.log(
              `Sent auto-reply for ticket ${createdTicket.ticketNumber}`,
            );
          } catch (e) {
            this.logger.error('Failed to send auto-reply', e);
          }
        }

        // Upload attachments to Drive and save to DB
        if (uniqueAttachments.length > 0 && createdMessage) {
          this.logger.log(
            `Found ${uniqueAttachments.length} unique attachments, uploading to Drive...`,
          );
          const drive = google.drive({ version: 'v3', auth });

          for (const att of uniqueAttachments) {
            try {
              const attRes = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: msg.id,
                id: att.attachmentId,
              });

              const buffer = Buffer.from(attRes.data.data as string, 'base64');
              const stream = Readable.from(buffer);

              const fileMetadata: any = {
                name: att.filename,
              };
              if (folderId) {
                fileMetadata.parents = [folderId];
              }

              const driveRes = await drive.files.create({
                requestBody: fileMetadata,
                media: {
                  mimeType: att.mimeType,
                  body: stream,
                },
                fields: 'id, webViewLink',
              });

              const newAttachment = new this.attachmentModel({
                messageId: createdMessage._id,
                fileName: att.filename,
                mimeType: att.mimeType,
                driveFileId: driveRes.data.id,
                driveFileLink: driveRes.data.webViewLink,
                size: att.size,
              });
              await newAttachment.save();
              this.logger.log(`Uploaded ${att.filename} to Drive.`);
            } catch (err) {
              this.logger.error(
                `Failed to upload attachment ${att.filename}`,
                err,
              );
            }
          }
        }

        // Mark as READ in Gmail
        await gmail.users.messages.modify({
          userId: 'me',
          id: msg.id,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        });

        this.logger.log(
          `Successfully processed and created ticket for message ${msg.id}`,
        );
      }
    } catch (error) {
      this.logger.error('Error during manual email sync', error);
      throw error;
    }
  }
}
