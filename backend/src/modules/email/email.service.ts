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
import { GmailConnection, GmailConnectionStatus } from './schemas/gmail-connection.schema';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private timerHandle: any = null;
  private isSyncing = false;

  constructor(
    @InjectQueue('email-ingestion') private emailQueue: Queue,
    private readonly googleAuthService: GoogleAuthService,
    private readonly aiService: AiService,
    private readonly ticketsService: TicketsService,
    private readonly configService: ConfigService,
    @InjectModel(Attachment.name) private attachmentModel: Model<Attachment>,
    @InjectModel(GmailConnection.name) private gmailConnectionModel: Model<GmailConnection>,
  ) {}

  onModuleInit() {
    this.logger.log('Starting automatic email polling worker for Gmail Connections...');
    // We poll every 10 seconds to cycle through active connections
    this.timerHandle = setInterval(async () => {
      if (this.isSyncing) return;
      this.isSyncing = true;
      try {
        await this.syncAllAccounts();
      } catch (error) {
        this.logger.error('Error in polling loop', error);
      } finally {
        this.isSyncing = false;
      }
    }, 10000);
  }

  onModuleDestroy() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.logger.log('Stopped automatic email polling worker.');
    }
  }

  // --- Helper Methods ---
  async getConnections(): Promise<any[]> {
    return this.gmailConnectionModel.find({}, '-encryptedAccessToken -encryptedRefreshToken').lean();
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

  private findHeaderRecursive(payload: any, headerName: string): string | undefined {
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
    let cleaned = bodyText.replace(/\s*On\s+[\s\S]*?wrote:[\s\S]*/gi, '');
    cleaned = cleaned.replace(/\s*---------- Forwarded message ---------[\s\S]*/gi, '');
    return cleaned.trim() || bodyText;
  }

  // --- Main Ingestion Logic ---

  async syncAllAccounts(): Promise<void> {
    const connections = await this.gmailConnectionModel.find({
      isActive: true,
      status: GmailConnectionStatus.CONNECTED,
    });

    for (const connection of connections) {
      try {
        await this.syncAccount(connection._id.toString());
      } catch (error) {
        this.logger.error(`Error syncing account ${connection.emailAddress}`, error);
      }
    }
    
    try {
      await this.syncGlobalAccount();
    } catch(err) {
      this.logger.error('Error syncing global account', err);
    }
  }

  async syncAccount(connectionId: string): Promise<void> {
    const connection = await this.gmailConnectionModel.findById(connectionId);
    if (!connection || !connection.isActive || connection.status !== GmailConnectionStatus.CONNECTED) {
      return;
    }

    try {
      const auth = await this.googleAuthService.getAuthClientForConnection(connectionId);
      const gmail = google.gmail({ version: 'v1', auth });

      let messages = [];

      if (connection.lastSyncHistoryId) {
        // Incremental sync using history
        try {
          const res = await gmail.users.history.list({
            userId: 'me',
            startHistoryId: connection.lastSyncHistoryId,
            historyTypes: ['messageAdded'],
          });
          
          if (res.data.history) {
            for (const record of res.data.history) {
              if (record.messagesAdded) {
                messages.push(...record.messagesAdded.map((m) => m.message));
              }
            }
          }
          if (res.data.historyId) {
            connection.lastSyncHistoryId = res.data.historyId;
          }
        } catch (error) {
          if (error.code === 404 || error.message.includes('historyId')) {
            this.logger.warn(`History ID stale for ${connection.emailAddress}. Falling back to full fetch.`);
            connection.lastSyncHistoryId = undefined; // force full fetch
          } else if (error.message.includes('invalid_grant')) {
            this.logger.error(`Revoked/Invalid grant for ${connection.emailAddress}. Disabling connection.`);
            connection.status = GmailConnectionStatus.REVOKED;
            await connection.save();
            return;
          } else {
            throw error;
          }
        }
      } 
      
      if (!connection.lastSyncHistoryId) {
        // Full fetch / fallback: grab recent unread
        const res = await gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread -from:me',
          maxResults: 10,
        });
        messages = res.data.messages || [];
        
        // Update historyId for next time
        const profile = await gmail.users.getProfile({ userId: 'me' });
        if (profile.data.historyId) {
          connection.lastSyncHistoryId = profile.data.historyId;
        }
      }

      if (messages.length === 0) {
        await connection.save();
        return;
      }

      this.logger.log(`Found ${messages.length} messages for ${connection.emailAddress}. Processing...`);

      for (const msg of messages) {
        if (!msg || !msg.id) continue;
        const msgId = msg.id;

        // Idempotency Check
        const exists = await this.ticketsService.findMessageByGmailId(connectionId, msgId);
        if (exists) {
          this.logger.log(`Message ${msgId} already processed for ${connection.emailAddress}. Skipping.`);
          continue;
        }

        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: msgId,
          format: 'full',
        });

        const messageData: any = msgRes.data;

        const subject = this.findHeaderRecursive(messageData.payload, 'Subject') || '(no subject)';
        const from = this.findHeaderRecursive(messageData.payload, 'From') || 'Unknown';
        const messageIdHeader = this.findHeaderRecursive(messageData.payload, 'Message-ID');
        const inReplyTo = this.findHeaderRecursive(messageData.payload, 'In-Reply-To');
        const referencesHeader = this.findHeaderRecursive(messageData.payload, 'References');
        const references = referencesHeader ? referencesHeader.split(/\s+/) : [];
        const threadId = messageData.threadId;

        this.logger.log(`Parsed email -> ThreadId: ${threadId} | From: ${from} | Subject: ${subject}`);

        const rawBodyText = messageData.snippet || '';
        const bodyText = this.cleanEmailBody(rawBodyText);

        const emailRegex = /<([^>]+)>/;
        const emailMatch = from ? from.match(emailRegex) : null;
        const customerEmail = emailMatch ? emailMatch[1] : from;

        const parts = messageData.payload?.parts || [];
        const rawAttachments = this.getAttachmentsFromParts(parts);
        const uniqueAttachments: any[] = [];
        const seenAttIds = new Set<string>();
        for (const att of rawAttachments) {
          if (att.attachmentId && !seenAttIds.has(att.attachmentId)) {
            seenAttIds.add(att.attachmentId);
            uniqueAttachments.push(att);
          }
        }

        // Try to find existing ticket by gmailThreadId or references
        let existingTicket = null;
        if (threadId) {
          existingTicket = await this.ticketsService.findTicketByGmailThreadId(connectionId, threadId);
        }

        if (!existingTicket && inReplyTo) {
          existingTicket = await this.ticketsService.findTicketByMessageIdHeader(inReplyTo);
        }

        let createdMessage: any = null;
        const messageMetadata = {
          gmailConnectionId: connectionId,
          gmailMessageId: msgId,
          gmailThreadId: threadId,
          messageId: messageIdHeader,
          inReplyTo,
          references,
        };

        if (existingTicket) {
          this.logger.log(`Appending reply to existing ticket ${existingTicket.ticketNumber}`);
          createdMessage = await this.ticketsService.addMessage(
            existingTicket._id.toString(),
            'INBOUND',
            customerEmail,
            [connection.emailAddress],
            subject,
            bodyText,
            msgId, // messageId (legacy)
            messageMetadata
          );
        } else {
          // Classify and create new ticket
          const aiResult = await this.aiService.classifyEmail(subject, bodyText);
          const result = await this.ticketsService.createTicket({
            subject,
            customerEmail,
            initialMessage: bodyText,
            aiClassification: aiResult,
            departmentId: connection.departmentId?.toString(),
            ...messageMetadata,
          }) as any;

          if (result.ticket) {
            createdMessage = result.message;
            // Optionally auto-reply here using the connection's auth
          }
        }

        // Upload attachments
        if (uniqueAttachments.length > 0 && createdMessage) {
          const folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID') || null;
          const drive = google.drive({ version: 'v3', auth });

          for (const att of uniqueAttachments) {
            try {
              const attRes = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: msgId,
                id: att.attachmentId,
              });

              const buffer = Buffer.from(attRes.data.data as string, 'base64');
              const stream = Readable.from(buffer);

              const fileMetadata: any = { name: att.filename };
              if (folderId) fileMetadata.parents = [folderId];

              const driveRes = await drive.files.create({
                requestBody: fileMetadata,
                media: { mimeType: att.mimeType, body: stream },
                fields: 'id, webViewLink',
              });

              await new this.attachmentModel({
                messageId: createdMessage._id,
                fileName: att.filename,
                mimeType: att.mimeType,
                driveFileId: driveRes.data.id,
                driveFileLink: driveRes.data.webViewLink,
                size: att.size,
              }).save();
            } catch (err) {
              this.logger.error(`Failed to upload attachment ${att.filename}`, err);
            }
          }
        }

        // Remove UNREAD label
        try {
          await gmail.users.messages.modify({
            userId: 'me',
            id: msgId,
            requestBody: { removeLabelIds: ['UNREAD'] },
          });
        } catch (e) {
          // Ignore
        }
      }

      connection.lastSyncAt = new Date();
      await connection.save();

    } catch (error) {
      if (error.message?.includes('invalid_grant')) {
        this.logger.error(`Invalid grant for ${connection.emailAddress}. Disabling connection.`);
        connection.status = GmailConnectionStatus.REVOKED;
        await connection.save();
      } else {
        this.logger.error(`Error in syncAccount for ${connection.emailAddress}`, error);
      }
    }
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

  async syncGlobalAccount(): Promise<void> {
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
                gmailThreadId: threadId,
                gmailMessageId: msg.id,
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
            gmailThreadId: threadId,
            gmailMessageId: msg.id,
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
