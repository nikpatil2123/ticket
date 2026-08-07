import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Department } from './department.schema';

@Schema({ timestamps: true })
export class Team extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Department',
    required: true,
  })
  departmentId: Department;
}

export const TeamSchema = SchemaFactory.createForClass(Team);
