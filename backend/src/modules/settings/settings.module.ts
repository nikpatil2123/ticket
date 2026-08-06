import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SystemSettings, SystemSettingsSchema } from '../auth/schemas/system-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SystemSettings.name, schema: SystemSettingsSchema }])
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
