import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Message } from '../../tickets/schemas/message.schema';

@Schema({ timestamps: true })
export class Attachment extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true,
  })
  messageId: MongooseSchema.Types.ObjectId | Message;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  driveFileId: string;

  @Prop({ required: true })
  driveFileLink: string;

  @Prop()
  size: number;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);
