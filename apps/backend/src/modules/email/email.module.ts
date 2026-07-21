import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailIngestionProcessor } from './processors/email-ingestion.processor';
import { SyncState, SyncStateSchema } from './schemas/sync-state.schema';
import { Attachment, AttachmentSchema } from './schemas/attachment.schema';
import { TicketsModule } from '../tickets/tickets.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email-ingestion',
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
    MongooseModule.forFeature([
      { name: SyncState.name, schema: SyncStateSchema },
      { name: Attachment.name, schema: AttachmentSchema },
    ]),
    TicketsModule, // Needed for processor to interact with tickets
    AuthModule,
    AiModule,
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailIngestionProcessor],
  exports: [EmailService],
})
export class EmailModule {}
