import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { Role } from '../../entities/role.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { MailService } from '../mail/mail.service';
import { StorageService } from '../storage/storage.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;

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

  const mockUserRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
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
      // Arrange
      const newUser = new User();
      newUser.username = 'test_user';
      newUser.password = 'plain_password';

      const savedUser = { ...mockUser };
      mockRoleRepository.findOne.mockResolvedValue(mockAdminRole);
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockUserRepository.findOne.mockResolvedValue(null); // No existing user

      // Act
      const result = await service.register(newUser, ['Admin']);

      // Assert
      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.user).toBeDefined();
      expect((result.user as any).password).toBeUndefined();
      expect(result.user.username).toBe('test_user');
      expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 10);
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { role_name: 'Admin' },
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when role does not exist', async () => {
      // Arrange
      const newUser = new User();
      newUser.username = 'test_user';
      newUser.password = 'plain_password';

      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.register(newUser, ['NonExistentRole'])).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(newUser, ['NonExistentRole'])).rejects.toThrow(
        'Role "NonExistentRole" not found',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // login
  // ─────────────────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('should return AuthResponseDto with access_token on valid credentials', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(undefined);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.login('test_user', 'plain_password');

      // Assert
      expect(result).toBeDefined();
      expect(result.access_token).toBe('mock.jwt.token');
      expect(result.username).toBe('test_user');
      expect(result.id).toBe(1);
      expect(result.roles).toContain('Admin');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login('unknown', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when account is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, is_active: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(service.login('test_user', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login('test_user', 'wrong_password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // validateUser
  // ─────────────────────────────────────────────────────────────────────────────
  describe('validateUser', () => {
    it('should return user when payload is valid', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser({ sub: 1 });

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['roles'],
      });
    });

    it('should return null when user is not found', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateUser({ sub: 999 });

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getUsersByRole
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getUsersByRole', () => {
    it('should return users with the given role without passwords', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getUsersByRole('Admin');

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect((result[0] as any).password).toBeUndefined();
      expect(result[0].username).toBe('test_user');
    });

    it('should return empty array when no users have the given role', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getUsersByRole('NonExistentRole');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
