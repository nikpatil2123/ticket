import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { ConfigService } from '@nestjs/config';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  describe('classifyEmail', () => {
    it('should return a structured classification result', async () => {
      const result = await service.classifyEmail('Need help with invoice INV-12345', 'Please refund me.');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('extractedEntities');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });
  });
});
