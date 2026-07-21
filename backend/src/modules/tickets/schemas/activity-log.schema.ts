import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Ticket } from './ticket.schema';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true })
export class ActivityLog extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Ticket', required: true, index: true })
  ticketId: Ticket;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  actorId: User; // Null if system

  @Prop({ required: true })
  action: string; // CREATED, STATUS_CHANGED, NOTE_ADDED, etc.

  @Prop({ type: Object })
  changes: Record<string, any>; // e.g. { oldStatus: 'OPEN', newStatus: 'RESOLVED' }

  @Prop()
  note: string; // Internal agent note content
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({ ticketId: 1, createdAt: -1 });
