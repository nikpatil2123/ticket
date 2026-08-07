import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';
import { AuthModule } from '../auth/auth.module';

import {
  Attachment,
  AttachmentSchema,
} from '../email/schemas/attachment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: Message.name, schema: MessageSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: Attachment.name, schema: AttachmentSchema },
    ]),
    AuthModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
