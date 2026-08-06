import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Template extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  bodyText: string;

  @Prop({ required: false })
  createdBy?: string;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
