import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed_password'), compare: jest.fn().mockResolvedValue(true) }));

describe('AuthController', () => {
  let controller: AuthController;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AuthController],
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

    controller = module.get<AuthController>(AuthController);
  });

  it('should register a new user', async () => {
    const user: User = { id: 1, username: 'test', password: 'test', role: 'test' };
    const result = await controller.register(user);
    expect(result).toEqual({ id: 1, username: 'test', password: 'hashed_password', role: 'test' });
  });

  it('should login a user', async () => {
    const user: User = { id: 1, username: 'test', password: 'test', role: 'test' };
    const result = await controller.login({ username: user.username, password: user.password });
    expect(result).toEqual({ id: 1, username: 'test', password: 'hashed_password', role: 'test' });
  });

  it('should get users by role', async () => {
    const role = 'test';
    const result = await controller.getUsersByRole(role);
    expect(result).toEqual([]);
  });
});