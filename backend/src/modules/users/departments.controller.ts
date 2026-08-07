import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly deptService: DepartmentsService) {}

  @Get()
  async getAll() {
    const data = await this.deptService.getAll();
    return { data };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const data = await this.deptService.getById(id);
    return { data };
  }

  @Post()
  async create(@Body() body: any) {
    const data = await this.deptService.create(body);
    return { data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.deptService.update(id, body);
    return { data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.deptService.delete(id);
    return { success: true };
  }
}
