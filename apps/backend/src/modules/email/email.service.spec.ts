import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('EmailService', () => {
  let service: EmailService;
  let emailQueue: any;

  beforeEach(async () => {
    emailQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: getQueueToken('email-ingestion'),
          useValue: emailQueue,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('handleWebhook', () => {
    it('should extract historyId and enqueue job', async () => {
      const payload = {
        message: {
          data: Buffer.from(JSON.stringify({ historyId: '12345' })).toString('base64'),
        },
      };

      await service.handleWebhook(payload);

      expect(emailQueue.add).toHaveBeenCalledWith('fetch-history', { historyId: '12345' });
    });

    it('should not throw if payload is invalid', async () => {
      const payload = { message: { data: 'invalid-base64' } };
      
      // Should catch error internally and log it, not crash the app
      await expect(service.handleWebhook(payload)).resolves.not.toThrow();
      expect(emailQueue.add).not.toHaveBeenCalled();
    });
  });
});
