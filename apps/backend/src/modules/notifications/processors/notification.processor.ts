import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationTemplate, NotificationChannel } from '../schemas/notification-template.schema';
import { UsersService } from '../../users/users.service';

@Processor('notifications', { concurrency: 10 })
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectModel(NotificationTemplate.name) private templateModel: Model<NotificationTemplate>,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'dispatch-notification':
        await this.handleDispatch(job.data);
        break;
      default:
        this.logger.warn(`Unknown job name in notifications queue: ${job.name}`);
    }
  }

  private async handleDispatch(data: { templateName: string, recipientId: string, variables: Record<string, string> }) {
    const { templateName, recipientId, variables } = data;
    
    const template = await this.templateModel.findOne({ name: templateName, isActive: true });
    if (!template) {
      this.logger.warn(`Template ${templateName} not found or inactive. Skipping.`);
      return;
    }

    const user = await this.usersService.getUserById(recipientId);
    
    // Compile template (simple string replace for demonstration, in production use Handlebars)
    let subject = template.subjectTemplate;
    let body = template.bodyTemplate;
    for (const [key, value] of Object.entries(variables)) {
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    if (template.channel === NotificationChannel.EMAIL) {
      // Logic to send actual SMTP/SES email here
      this.logger.log(`[EMAIL DISPATCHED] To: ${user.email} | Subject: ${subject}`);
    } else if (template.channel === NotificationChannel.IN_APP) {
      // Logic to push to WebSockets/Firebase here
      this.logger.log(`[IN_APP DISPATCHED] To User: ${(user as any).id || (user as any)._id} | Payload: ${subject}`);
    }
  }
}
