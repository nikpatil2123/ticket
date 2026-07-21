import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository';
import { Department } from './schemas/department.schema';

@Injectable()
export class DepartmentsService {
  constructor(private readonly deptRepo: DepartmentsRepository) {}

  async getAll(): Promise<Department[]> {
    return this.deptRepo.findAll();
  }

  async getById(id: string): Promise<Department> {
    const dept = await this.deptRepo.findById(id);
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(data: Partial<Department>): Promise<Department> {
    if (!data.supportEmailAlias) {
      data.supportEmailAlias = `${data.name?.toLowerCase().replace(/\s+/g, '') || 'support'}@acme.com`;
    }
    return this.deptRepo.create(data);
  }

  async update(id: string, data: Partial<Department>): Promise<Department> {
    const updated = await this.deptRepo.update(id, data);
    if (!updated) throw new NotFoundException('Department not found');
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.deptRepo.delete(id);
  }
}
