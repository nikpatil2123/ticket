import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class OAuthState extends Document {
  @Prop({ required: true, unique: true })
  state: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  organizationId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  departmentId?: string;

  @Prop({ required: true, index: { expires: 0 } })
  expiresAt: Date;
}

export const OAuthStateSchema = SchemaFactory.createForClass(OAuthState);
