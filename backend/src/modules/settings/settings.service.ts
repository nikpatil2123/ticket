import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemSettings } from '../auth/schemas/system-settings.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(SystemSettings.name)
    private settingsModel: Model<SystemSettings>,
  ) {}

  async getSetting(key: string): Promise<any> {
    const setting = await this.settingsModel.findOne({ key });
    return setting ? setting.value : null;
  }

  async updateSetting(key: string, value: any): Promise<SystemSettings> {
    return this.settingsModel.findOneAndUpdate(
      { key },
      { $set: { value } },
      { upsert: true, returnDocument: 'after' },
    );
  }
}
