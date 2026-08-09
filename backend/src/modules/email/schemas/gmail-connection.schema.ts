import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Department } from '../../users/schemas/department.schema';

export enum GmailConnectionStatus {
  CONNECTED = 'CONNECTED',
  REVOKED = 'REVOKED',
  ERROR = 'ERROR',
}

@Schema({ timestamps: true })
export class GmailConnection extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId })
  organizationId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: false })
  departmentId: Department;

  @Prop({ required: true, unique: true })
  emailAddress: string;

  @Prop({ required: true })
  googleUserId: string;

  @Prop({ required: true })
  encryptedAccessToken: string;

  @Prop({ required: true })
  encryptedRefreshToken: string;

  @Prop({ required: true })
  tokenExpiry: Date;

  @Prop({ type: [String], required: true })
  scopes: string[];

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ type: String, enum: GmailConnectionStatus, default: GmailConnectionStatus.CONNECTED })
  status: GmailConnectionStatus;

  @Prop({ required: false })
  lastSyncHistoryId?: string;

  @Prop({ required: false })
  lastSyncAt?: Date;
}

export const GmailConnectionSchema = SchemaFactory.createForClass(GmailConnection);
