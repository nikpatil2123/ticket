import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationsQueue: any;

  beforeEach(async () => {
    notificationsQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getQueueToken('notifications'),
          useValue: notificationsQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('sendNotification', () => {
    it('should enqueue a notification job', async () => {
      await service.sendNotification('WELCOME_EMAIL', 'user-1', { name: 'John' });
      expect(notificationsQueue.add).toHaveBeenCalledWith('dispatch-notification', {
        templateName: 'WELCOME_EMAIL',
        recipientId: 'user-1',
        variables: { name: 'John' },
      });
    });

    it('should swallow errors if enqueue fails', async () => {
      notificationsQueue.add.mockRejectedValue(new Error('Redis down'));
      await expect(service.sendNotification('WELCOME_EMAIL', 'user-1', {})).resolves.not.toThrow();
    });
  });
});
