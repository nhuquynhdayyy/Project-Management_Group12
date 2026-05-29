import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    getUsersByRole: jest.fn(),
    getAllUsers: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user', async () => {
    const registerDto = {
      username: 'test',
      password: 'Test@123',
      roles: ['admin'],
    };

    const mockResult = {
      id: 1,
      username: 'test',
      email: null,
      full_name: null,
      roles: [],
    };
    mockAuthService.register.mockResolvedValue(mockResult);

    const result = await controller.register(registerDto);

    expect(result).toBeDefined();
    expect(result.username).toBe('test');
    expect(mockAuthService.register).toHaveBeenCalled();
  });

  it('should login a user and return access token', async () => {
    const loginDto = { username: 'test', password: 'Test@123' };
    const mockResult = {
      access_token: 'jwt.token.here',
      id: 1,
      username: 'test',
      roles: ['admin'],
    };
    mockAuthService.login.mockResolvedValue(mockResult);

    const result = await controller.login(loginDto);

    expect(result).toBeDefined();
    expect(result.access_token).toBeDefined();
    expect(mockAuthService.login).toHaveBeenCalledWith('test', 'Test@123');
  });

  it('should get users by role', async () => {
    const mockUsers = [{ id: 1, username: 'admin', roles: [] }];
    mockAuthService.getUsersByRole.mockResolvedValue(mockUsers);

    const result = await controller.getUsersByRole('admin');

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(mockAuthService.getUsersByRole).toHaveBeenCalledWith('admin');
  });

  it('should logout the current user', async () => {
    mockAuthService.logout.mockResolvedValue(undefined);
    const req = { user: { userId: 1, username: 'test' } };

    const result = await controller.logout(req);

    expect(result).toEqual({ success: true });
    expect(mockAuthService.logout).toHaveBeenCalledWith(1, 'test');
  });
});
