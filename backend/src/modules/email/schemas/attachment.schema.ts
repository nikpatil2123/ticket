import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Message } from '../../tickets/schemas/message.schema';

@Schema({ timestamps: true })
export class Attachment extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', required: true, index: true })
  messageId: Message;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  s3Key: string;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);
