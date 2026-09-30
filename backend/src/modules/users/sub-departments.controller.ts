import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SubDepartmentsService } from './sub-departments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/sub-departments')
export class SubDepartmentsController {
  constructor(private readonly subDeptsService: SubDepartmentsService) {}

  @Get()
  async getByDepartment(@Query('departmentId') departmentId: string) {
    if (!departmentId) {
      const all = await this.subDeptsService.findAll();
      return { data: all };
    }
    const data = await this.subDeptsService.findByDepartmentId(departmentId);
    return { data };
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() body: any) {
    const data = await this.subDeptsService.create(body);
    return { data };
  }

  @Roles('ADMIN')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.subDeptsService.update(id, body);
    return { data };
  }

  @Roles('ADMIN')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.subDeptsService.delete(id);
    return { success: true };
  }
}
