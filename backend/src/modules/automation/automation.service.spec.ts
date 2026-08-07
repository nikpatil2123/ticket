import { Test, TestingModule } from '@nestjs/testing';
import { AutomationService } from './automation.service';
import { TicketsService } from '../tickets/tickets.service';
import {
  AutomationEvent,
  ConditionOperator,
} from './schemas/automation-rule.schema';
import { getModelToken } from '@nestjs/mongoose';

describe('AutomationService', () => {
  let service: AutomationService;
  let ticketsService: jest.Mocked<TicketsService>;

  beforeEach(async () => {
    const mockRuleModel = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const mockTicketsService = {
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        {
          provide: getModelToken('AutomationRule'),
          useValue: mockRuleModel,
        },
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
    ticketsService = module.get(TicketsService);

    // Override the model instance property
    (service as any).automationRuleModel = mockRuleModel;
  });

  describe('evaluateConditions', () => {
    it('should correctly evaluate AND conditions', () => {
      const rule = {
        conditionLogic: 'AND',
        conditions: [
          {
            field: 'status',
            operator: ConditionOperator.EQUALS,
            value: 'OPEN',
          },
          {
            field: 'priority',
            operator: ConditionOperator.EQUALS,
            value: 'P1',
          },
        ],
      } as any;

      const ticket = { status: 'OPEN', priority: 'P1' } as any;
      expect((service as any).evaluateConditions(rule, ticket)).toBe(true);

      const ticketFail = { status: 'CLOSED', priority: 'P1' } as any;
      expect((service as any).evaluateConditions(rule, ticketFail)).toBe(false);
    });

    it('should correctly evaluate nested properties', () => {
      const rule = {
        conditionLogic: 'AND',
        conditions: [
          {
            field: 'aiClassification.intent',
            operator: ConditionOperator.EQUALS,
            value: 'Refund',
          },
        ],
      } as any;

      const ticket = { aiClassification: { intent: 'Refund' } } as any;
      expect((service as any).evaluateConditions(rule, ticket)).toBe(true);
    });
  });
});
