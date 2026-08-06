import { Controller, Get, Param, Put, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':key')
  async getSetting(@Param('key') key: string, @Req() req: any) {
    const isAdmin = req.user.role === 'ADMIN' || req.user.roleId?.name === 'ADMIN';
    if (!isAdmin) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    const value = await this.settingsService.getSetting(key);
    return { data: value };
  }

  @Put(':key')
  async updateSetting(
    @Param('key') key: string,
    @Body() value: any,
    @Req() req: any
  ) {
    const isAdmin = req.user.role === 'ADMIN' || req.user.roleId?.name === 'ADMIN';
    if (!isAdmin) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    const updated = await this.settingsService.updateSetting(key, value);
    return { data: updated.value };
  }
}
