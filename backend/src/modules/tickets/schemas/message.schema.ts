import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Ticket } from './ticket.schema';
import { User } from '../../users/schemas/user.schema';

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  INTERNAL = 'INTERNAL',
}

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
    index: true,
  })
  ticketId: Ticket;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'GmailConnection' })
  gmailConnectionId?: string;

  @Prop()
  gmailMessageId?: string; // The ID assigned by Google APIs

  @Prop()
  gmailThreadId?: string; // The thread ID assigned by Google APIs

  @Prop()
  messageId?: string; // The RFC 2822 Message-ID header

  @Prop()
  inReplyTo?: string; // The RFC 2822 In-Reply-To header

  @Prop({ type: [String], default: [] })
  references: string[]; // The RFC 2822 References header

  @Prop({ type: String, enum: MessageDirection, required: true })
  direction: MessageDirection;

  @Prop({ required: true })
  from: string;

  @Prop({ type: [String], required: true })
  to: string[];

  @Prop({ type: [String], default: [] })
  cc: string[];

  @Prop()
  bodyText: string;

  @Prop()
  bodyHtml: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  sentBy: User; // Only for outbound

  @Prop({ required: true })
  receivedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Index to quickly fetch chronologically
MessageSchema.index({ ticketId: 1, receivedAt: 1 });

// Unique compound index for idempotency across Gmail imports
MessageSchema.index(
  { gmailConnectionId: 1, gmailMessageId: 1 },
  { unique: true, partialFilterExpression: { gmailMessageId: { $exists: true } } }
);
