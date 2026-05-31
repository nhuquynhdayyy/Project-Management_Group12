import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './user.entity';
import { Role } from '../../entities/role.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { MailService } from '../mail/mail.service';
import { StorageService } from '../storage/storage.service';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditLog } from '../../entities/auditLog.entity';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;

  // Dữ liệu mẫu (Mocks Data)
  const mockAdminRole: Role = {
    id: 1,
    role_name: 'Admin',
    description: 'Administrator',
    users: [],
  };

  const mockUser: User = {
    id: 1,
    username: 'test_user',
    email: 'test@example.com',
    password: 'hashed_password',
    full_name: 'Test User',
    avatar_url: null,
    assigned_area_id: null,
    is_active: true,
    is_verified: true,
    verification_token: null,
    last_login_at: null,
    roles: [mockAdminRole],
    created_at: new Date(),
    updated_at: new Date(),
    role: 'Admin',
  };

  // Các Mock Repositories và Services
  const mockUserRepository = {
    save: jest
      .fn()
      .mockImplementation((user) =>
        Promise.resolve({ ...mockUser, ...user, id: 1 }),
      ),
    findOne: jest.fn().mockResolvedValue(mockUser),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(),
  };

  const mockRoleRepository = {
    findOne: jest.fn(),
  };

  const mockPasswordResetTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockMailService = {
    sendVerificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  const mockStorageService = {
    uploadAvatar: jest.fn(),
    deleteAvatar: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verify: jest.fn().mockReturnValue({ sub: 1, username: 'test_user' }),
  };

  const mockAuditLogService = {
    log: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockPasswordResetTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        { provide: AuditLogService, useValue: mockAuditLogService },
        // Cần thiết để AuditLogService không bị lỗi khi khởi tạo
        { provide: getRepositoryToken(AuditLog), useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // register
  // ─────────────────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('should register a new user and return user without password', async () => {
      const newUser = new User();
      newUser.username = 'test_user';
      newUser.password = 'plain_password';

      mockRoleRepository.findOne.mockResolvedValue(mockAdminRole);
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockUserRepository.findOne.mockResolvedValue(null); // No existing user

      const result = await service.register(newUser, ['Admin']);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.user).toBeDefined();
      expect((result.user as any).password).toBeUndefined();
      expect(result.user.username).toBe('test_user');
      expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 10);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when role does not exist', async () => {
      mockRoleRepository.findOne.mockResolvedValue(null);
      const newUser = new User();

      await expect(service.register(newUser, ['NonExistentRole'])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // login
  // ─────────────────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('should return AuthResponseDto and log the login event', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test_user', 'plain_password');

      expect(result).toBeDefined();
      expect(result.access_token).toBe('mock.jwt.token');
      expect(mockJwtService.sign).toHaveBeenCalled();
      // Kiểm tra xem có thực hiện log audit không (từ phase-3)
      // expect(mockAuditLogService.log).toHaveBeenCalled(); 
    });

    it('should throw UnauthorizedException when credentials invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.login('unknown', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when account is inactive', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);
      await expect(service.login('test_user', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  it('should create a LOGIN audit log on successful login', async () => {
    await service.login('test', 'test');

    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      1,
      'LOGIN',
      'auth',
      null,
      null,
      expect.objectContaining({ username: 'test', roles: ['admin'] }),
    );
  });

  it('should create a LOGOUT audit log', async () => {
    await service.logout(1, 'test');

    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      1,
      'LOGOUT',
      'auth',
      null,
      null,
      { username: 'test' },
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // validateUser
  // ─────────────────────────────────────────────────────────────────────────────
  describe('validateUser', () => {
    it('should return user when payload is valid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.validateUser({ sub: 1 });
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should return null when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const result = await service.validateUser({ sub: 999 });
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getUsersByRole
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getUsersByRole', () => {
    it('should return users with the given role without passwords', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUsersByRole('Admin');

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect((result[0] as any).password).toBeUndefined();
    });
  });
});
