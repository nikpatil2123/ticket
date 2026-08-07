import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(UsersRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should throw ConflictException if user already exists', async () => {
      repository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
      } as any);

      await expect(
        service.createUser({
          email: 'test@test.com',
          firstName: 'John',
          lastName: 'Doe',
          roleId: 'role1',
          departmentId: 'dept1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password and create user', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        id: '1',
        email: 'new@test.com',
      } as any);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.createUser({
        email: 'new@test.com',
        firstName: 'Jane',
        lastName: 'Doe',
        roleId: 'role1',
        departmentId: 'dept1',
      });

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          passwordHash: 'hashedPassword',
        }),
      );
      expect(result._id).toBe('1');
    });
  });
});
