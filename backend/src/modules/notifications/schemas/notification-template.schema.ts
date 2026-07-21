import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

@Schema({ timestamps: true })
export class NotificationTemplate extends Document {
  @Prop({ required: true, unique: true })
  name: string; // e.g. TICKET_ASSIGNED_EMAIL

  @Prop({ type: String, enum: NotificationChannel, required: true })
  channel: NotificationChannel;

  @Prop({ required: true })
  subjectTemplate: string; // "Ticket {{ticketNumber}} Assigned to You"

  @Prop({ required: true })
  bodyTemplate: string; // HTML or Text with {{variables}}

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const NotificationTemplateSchema = SchemaFactory.createForClass(NotificationTemplate);
