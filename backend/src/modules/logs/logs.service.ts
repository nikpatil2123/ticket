import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log } from './schemas/log.schema';

@Injectable()
export class LogsService {
  constructor(@InjectModel(Log.name) private logModel: Model<Log>) {}

  async createLog(level: string, message: string, metadata: any = {}) {
    const newLog = new this.logModel({ level, message, metadata });
    return newLog.save();
  }

  async getLogs(limit: number = 100) {
    return this.logModel.find().sort({ timestamp: -1 }).limit(limit).exec();
  }
}
