import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Log extends Document {
  @Prop({ required: true })
  level: string; // 'info', 'warn', 'error'

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const LogSchema = SchemaFactory.createForClass(Log);
