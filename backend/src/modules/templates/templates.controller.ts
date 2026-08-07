import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async getAllTemplates() {
    const templates = await this.templatesService.findAll();
    return { data: templates };
  }

  @Post()
  async createTemplate(
    @Req() req: any,
    @Body() body: { name: string; bodyText: string },
  ) {
    if (req.user.role !== 'ADMIN' && req.user.roleId?.name !== 'ADMIN') {
      throw new ForbiddenException('Only Admins can create templates');
    }
    const template = await this.templatesService.create(
      body.name,
      body.bodyText,
      req.user.userId,
    );
    return { data: template };
  }

  @Delete(':id')
  async deleteTemplate(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN' && req.user.roleId?.name !== 'ADMIN') {
      throw new ForbiddenException('Only Admins can delete templates');
    }
    await this.templatesService.delete(id);
    return { data: { success: true } };
  }
}
