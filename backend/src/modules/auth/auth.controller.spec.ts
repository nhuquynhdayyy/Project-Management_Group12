import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
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

  // ─────────────────────────────────────────────────────────────────────────────
  // register
  // ─────────────────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('should register a new user and return user without password', async () => {
      const registerDto: RegisterDto = {
        username: 'test',
        password: 'Test@123',
        email: 'test@example.com',
        full_name: 'Test User',
        roles: ['admin'],
      };

      const mockResult = {
        id: 1,
        username: 'test',
        email: 'test@example.com',
        full_name: 'Test User',
        roles: [{ id: 1, role_name: 'admin' }],
        is_active: true,
      };

      mockAuthService.register.mockResolvedValue(mockResult);

      const result = await controller.register(registerDto as any);

      expect(result).toBeDefined();
      expect(result.username).toBe('test');
      expect((result as any).password).toBeUndefined();
      expect(mockAuthService.register).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // login
  // ─────────────────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('should return AuthResponseDto with access_token on valid credentials', async () => {
      const loginDto: LoginDto = { username: 'test', password: 'Test@123' };
      const mockAuthResponse: AuthResponseDto = { 
        access_token: 'jwt.token.here', 
        id: 1, 
        username: 'test', 
        roles: ['admin'] 
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toBeDefined();
      expect(result.access_token).toBeDefined();
      expect(result.username).toBe('test');
      expect(mockAuthService.login).toHaveBeenCalledWith('test', 'Test@123');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getUsersByRole
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getUsersByRole', () => {
    it('should return list of users with the given role', async () => {
      const mockUsers = [{ id: 1, username: 'admin', roles: [{ role_name: 'admin' }] }];
      mockAuthService.getUsersByRole.mockResolvedValue(mockUsers);

      const result = await controller.getUsersByRole('admin');

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(mockAuthService.getUsersByRole).toHaveBeenCalledWith('admin');
    });

    it('should return empty array when no users have the given role', async () => {
      mockAuthService.getUsersByRole.mockResolvedValue([]);
      const result = await controller.getUsersByRole('NonExistentRole');
      expect(result).toEqual([]);
    });
  });

  it('should logout the current user', async () => {
    mockAuthService.logout.mockResolvedValue(undefined);
    const req = { user: { userId: 1, username: 'test' } };

    const result = await controller.logout(req);

    expect(result).toEqual({ success: true });
    expect(mockAuthService.logout).toHaveBeenCalledWith(1, 'test');
  });
});
