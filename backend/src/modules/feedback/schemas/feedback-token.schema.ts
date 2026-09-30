import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type FeedbackTokenDocument = FeedbackToken & Document;

@Schema({ timestamps: true })
export class FeedbackToken {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Ticket', required: true })
  ticketId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;
}

export const FeedbackTokenSchema = SchemaFactory.createForClass(FeedbackToken);
