import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Department } from '../../users/schemas/department.schema';
import { User } from '../../users/schemas/user.schema';

export enum TicketStatus {
  NEW = 'NEW',
  OPEN = 'OPEN',
  PENDING_CUSTOMER = 'PENDING_CUSTOMER',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PENDING_DOCUMENT_CLARIFICATION = 'PENDING_DOCUMENT_CLARIFICATION',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  OTHER = 'OTHER',
}

export enum TicketPriority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

@Schema({ timestamps: true })
export class Ticket extends Document {
  @Prop({ unique: true, sparse: true })
  ticketNumber: string;

  @Prop({ required: true, index: true })
  customerEmail: string;

  @Prop({ required: true })
  subject: string;

  @Prop({
    type: String,
    enum: TicketStatus,
    default: TicketStatus.NEW,
    index: true,
  })
  status: TicketStatus;

  @Prop({ type: String, enum: TicketPriority, default: TicketPriority.P3 })
  priority: TicketPriority;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', index: true })
  departmentId: Department;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  assignedTo: User;

  @Prop({ type: String, enum: ['INTERNAL', 'EXTERNAL'], index: true })
  tatType?: 'INTERNAL' | 'EXTERNAL';

  @Prop({ type: Object })
  aiClassification: {
    intent: string;
    confidenceScore: number;
    extractedEntities: Record<string, string>;
  };

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ unique: true, sparse: true })
  threadId: string;

  @Prop({ type: Date, default: null })
  pausedAt?: Date;

  @Prop({ type: Number, default: 0 })
  totalPausedTimeMs?: number;

  @Prop({ type: Number, default: 1, min: 1 })
  requestCount: number;

  @Prop()
  messageId: string;

  @Prop()
  firstResponseAt: Date;

  @Prop()
  resolvedAt: Date;

  @Prop({ type: Date, default: null })
  inProgressAt?: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

// Compound index for dashboard filtering
TicketSchema.index({ status: 1, departmentId: 1 });

// Ensure unique ticketNumber only when ticketNumber field exists (avoid multiple null/undefined conflicts)
TicketSchema.index(
  { ticketNumber: 1 },
  { unique: true, partialFilterExpression: { ticketNumber: { $exists: true, $ne: null } } },
);

// Ensure unique threadId only when threadId exists
TicketSchema.index(
  { threadId: 1 },
  { unique: true, partialFilterExpression: { threadId: { $exists: true, $ne: null } } },
);
