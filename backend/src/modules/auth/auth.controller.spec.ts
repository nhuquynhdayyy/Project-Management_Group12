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
    getUsersByRole: jest.fn(),
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
      // Arrange
      const registerDto: RegisterDto = {
        username: 'new_user',
        email: 'new@example.com',
        password: 'P@ssw0rd!',
        full_name: 'New User',
        roles: ['Staff'],
      };

      const mockResult = {
        id: 1,
        username: 'new_user',
        email: 'new@example.com',
        full_name: 'New User',
        roles: [{ id: 3, role_name: 'Staff' }],
        is_active: true,
      };

      mockAuthService.register.mockResolvedValue(mockResult);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.username).toBe('new_user');
      expect((result as any).password).toBeUndefined();
      expect(mockAuthService.register).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'new_user' }),
        ['Staff'],
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // login
  // ─────────────────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('should return AuthResponseDto with access_token on valid credentials', async () => {
      // Arrange
      const loginDto: LoginDto = {
        username: 'test_user',
        password: 'P@ssw0rd!',
      };

      const mockAuthResponse: AuthResponseDto = {
        access_token: 'mock.jwt.token',
        id: 1,
        username: 'test_user',
        roles: ['Admin'],
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.access_token).toBe('mock.jwt.token');
      expect(result.username).toBe('test_user');
      expect(result.roles).toContain('Admin');
      expect(mockAuthService.login).toHaveBeenCalledWith('test_user', 'P@ssw0rd!');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getUsersByRole
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getUsersByRole', () => {
    it('should return list of users with the given role', async () => {
      // Arrange
      const mockUsers = [
        { id: 1, username: 'admin_user', roles: [{ role_name: 'Admin' }] },
        { id: 2, username: 'admin_user2', roles: [{ role_name: 'Admin' }] },
      ];

      mockAuthService.getUsersByRole.mockResolvedValue(mockUsers);

      // Act
      const result = await controller.getUsersByRole('Admin');

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(mockAuthService.getUsersByRole).toHaveBeenCalledWith('Admin');
    });

    it('should return empty array when no users have the given role', async () => {
      // Arrange
      mockAuthService.getUsersByRole.mockResolvedValue([]);

      // Act
      const result = await controller.getUsersByRole('NonExistentRole');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
