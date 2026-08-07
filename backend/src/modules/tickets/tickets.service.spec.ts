import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketStatus } from './schemas/ticket.schema';

describe('TicketsService', () => {
  let service: TicketsService;
  let repository: jest.Mocked<TicketsRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findTicketById: jest.fn(),
      updateTicketStatus: jest.fn(),
      logActivity: jest.fn(),
      getTimeline: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: TicketsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    repository = module.get(TicketsRepository);
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if ticket does not exist', async () => {
      repository.findTicketById.mockResolvedValue(null);
      await expect(
        service.updateStatus('1', { status: TicketStatus.RESOLVED }, 'actor1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if ticket is already CLOSED', async () => {
      repository.findTicketById.mockResolvedValue({
        status: TicketStatus.CLOSED,
      } as any);
      await expect(
        service.updateStatus('1', { status: TicketStatus.RESOLVED }, 'actor1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status and log activity', async () => {
      repository.findTicketById.mockResolvedValue({
        id: '1',
        status: TicketStatus.OPEN,
      } as any);
      repository.updateTicketStatus.mockResolvedValue({
        id: '1',
        status: TicketStatus.RESOLVED,
      } as any);

      const result = await service.updateStatus(
        '1',
        { status: TicketStatus.RESOLVED },
        'actor1',
      );

      expect(repository.updateTicketStatus).toHaveBeenCalledWith(
        '1',
        TicketStatus.RESOLVED,
        expect.any(Date),
      );
      expect(repository.logActivity).toHaveBeenCalledWith(
        '1',
        'actor1',
        'STATUS_CHANGED',
        { oldStatus: TicketStatus.OPEN, newStatus: TicketStatus.RESOLVED },
        undefined,
      );
      expect(result.status).toBe(TicketStatus.RESOLVED);
    });
  });
});
