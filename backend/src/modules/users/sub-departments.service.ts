import { Injectable, NotFoundException } from '@nestjs/common';
import { SubDepartmentsRepository } from './sub-departments.repository';
import { SubDepartment } from './schemas/sub-department.schema';

@Injectable()
export class SubDepartmentsService {
  constructor(private subDeptsRepo: SubDepartmentsRepository) {}

  async findAll(): Promise<SubDepartment[]> {
    return this.subDeptsRepo.findAll();
  }

  async findByDepartmentId(departmentId: string): Promise<SubDepartment[]> {
    return this.subDeptsRepo.findByDepartmentId(departmentId);
  }

  async create(data: Partial<SubDepartment>): Promise<SubDepartment> {
    return this.subDeptsRepo.create(data);
  }

  async update(
    id: string,
    data: Partial<SubDepartment>,
  ): Promise<SubDepartment> {
    const updated = await this.subDeptsRepo.update(id, data);
    if (!updated) {
      throw new NotFoundException('SubDepartment not found');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.subDeptsRepo.delete(id);
  }
}
