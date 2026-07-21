import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department } from './schemas/department.schema';

@Injectable()
export class DepartmentsRepository {
  constructor(@InjectModel(Department.name) private deptModel: Model<Department>) {}

  async findAll(): Promise<Department[]> {
    return this.deptModel.find().exec();
  }

  async findById(id: string): Promise<Department | null> {
    return this.deptModel.findById(id).exec();
  }

  async create(data: Partial<Department>): Promise<Department> {
    const dept = new this.deptModel(data);
    return dept.save();
  }

  async update(id: string, data: Partial<Department>): Promise<Department | null> {
    return this.deptModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<any> {
    return this.deptModel.findByIdAndDelete(id).exec();
  }
}
