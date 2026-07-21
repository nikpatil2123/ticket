import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async sendNotification(templateName: string, recipientId: string, variables: Record<string, string>): Promise<void> {
    try {
      await this.notificationsQueue.add('dispatch-notification', {
        templateName,
        recipientId,
        variables,
      });
      this.logger.log(`Enqueued notification [${templateName}] for recipient: ${recipientId}`);
    } catch (error) {
      this.logger.error(`Failed to enqueue notification [${templateName}]`, error);
    }
  }
}
