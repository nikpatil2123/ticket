import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SyncState extends Document {
  @Prop({ required: true, unique: true, default: 'SINGLETON' })
  singletonKey: string;

  @Prop({ required: true })
  lastHistoryId: string;
}

export const SyncStateSchema = SchemaFactory.createForClass(SyncState);
