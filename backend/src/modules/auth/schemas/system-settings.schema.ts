import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SystemSettings extends Document {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: Object, required: true })
  value: Record<string, any>;
}

export const SystemSettingsSchema =
  SchemaFactory.createForClass(SystemSettings);
