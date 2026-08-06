import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Template } from './schemas/template.schema';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(Template.name) private templateModel: Model<Template>,
  ) {}

  async create(name: string, bodyText: string, createdBy?: string): Promise<Template> {
    const template = new this.templateModel({ name, bodyText, createdBy });
    return template.save();
  }

  async findAll(): Promise<Template[]> {
    return this.templateModel.find().sort({ createdAt: -1 }).exec();
  }

  async delete(id: string): Promise<void> {
    const result = await this.templateModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Template not found');
    }
  }
}
