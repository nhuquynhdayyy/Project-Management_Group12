import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './user.entity';
import { Role } from '../../entities/role.entity';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditLog } from '../../entities/auditLog.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 1,
    username: 'test',
    password: 'hashed_password',
    role: 'test',
    email: null,
    full_name: null,
    assigned_area_id: null,
    is_active: true,
    last_login_at: null,
    roles: [{ id: 1, role_name: 'admin' }],
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUserRepository = {
    save: jest.fn().mockImplementation((user) =>
      Promise.resolve({ ...mockUser, ...user, id: 1 }),
    ),
    findOne: jest.fn().mockResolvedValue(mockUser),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockRoleRepository = {
    findOne: jest.fn().mockResolvedValue({ id: 1, role_name: 'admin' }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verify: jest.fn().mockReturnValue({ sub: 1, username: 'test' }),
  };

  const mockAuditLogService = {
    log: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        // Satisfy AuditLogService's @InjectRepository(AuditLog) metadata scan
        { provide: getRepositoryToken(AuditLog), useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user', async () => {
    const user = { ...mockUser, password: 'test' } as unknown as User;
    const result = await service.register(user, ['admin']);
    expect(result).toBeDefined();
    expect((result as any).username).toBe('test');
    expect((result as any).password).toBeUndefined();
  });

  it('should login a user and return access token', async () => {
    const result = await service.login('test', 'test');
    expect(result).toBeDefined();
    expect(result.username).toBe('test');
    expect(result.access_token).toBeDefined();
  });

  it('should validate a user', async () => {
    const result = await service.validateUser({ sub: 1 });
    expect(result).toBeDefined();
    expect(result?.username).toBe('test');
  });
});