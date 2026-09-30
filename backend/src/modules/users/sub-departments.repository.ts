import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubDepartment } from './schemas/sub-department.schema';

@Injectable()
export class SubDepartmentsRepository {
  constructor(
    @InjectModel(SubDepartment.name) private subDeptModel: Model<SubDepartment>,
  ) {}

  async findAll(): Promise<SubDepartment[]> {
    return this.subDeptModel.find().exec();
  }

  async findByDepartmentId(departmentId: string): Promise<SubDepartment[]> {
    return this.subDeptModel.find({ departmentId }).exec();
  }

  async findById(id: string): Promise<SubDepartment | null> {
    return this.subDeptModel.findById(id).exec();
  }

  async create(data: Partial<SubDepartment>): Promise<SubDepartment> {
    const subDept = new this.subDeptModel(data);
    return subDept.save();
  }

  async update(
    id: string,
    data: Partial<SubDepartment>,
  ): Promise<SubDepartment | null> {
    return this.subDeptModel
      .findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .exec();
  }

  async delete(id: string): Promise<any> {
    return this.subDeptModel.findByIdAndDelete(id).exec();
  }
}
