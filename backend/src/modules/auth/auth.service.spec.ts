import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed_password'), compare: jest.fn().mockResolvedValue(true) }));

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            save: jest.fn().mockImplementation((user) => Promise.resolve({ ...user, id: 1 })),
            findOne: jest.fn().mockResolvedValue({ id: 1, username: 'test', password: 'hashed_password', role: 'test' }),
            find: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should register a new user', async () => {
    const user: User = { id: 1, username: 'test', password: 'test', role: 'test' };
    const result = await service.register(user);
    expect(result).toEqual({ id: 1, username: 'test', password: 'hashed_password', role: 'test' });
  });

  it('should login a user', async () => {
    const user: User = { id: 1, username: 'test', password: 'test', role: 'test' };
    const result = await service.login(user.username, user.password);
    expect(result).toEqual({ id: 1, username: 'test', password: 'hashed_password', role: 'test' });
  });

  it('should validate a user', async () => {
    const result = await service.validateUser({ sub: 1 });
    expect(result).toEqual({ id: 1, username: 'test', password: 'hashed_password', role: 'test' });
  });
});