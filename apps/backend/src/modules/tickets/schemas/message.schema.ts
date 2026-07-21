import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Ticket } from './ticket.schema';
import { User } from '../../users/schemas/user.schema';

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Ticket', required: true, index: true })
  ticketId: Ticket;

  @Prop({ required: true, unique: true })
  messageId: string; // Gmail Message ID

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
