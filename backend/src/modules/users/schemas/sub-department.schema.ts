import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Department } from './department.schema';

@Schema({ timestamps: true })
export class SubDepartment extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true, index: true })
  departmentId: Department;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const SubDepartmentSchema = SchemaFactory.createForClass(SubDepartment);

// Compound index to ensure sub-department names are unique within a department
SubDepartmentSchema.index({ name: 1, departmentId: 1 }, { unique: true });
