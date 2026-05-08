import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from './auditLog.service';
import { AuditLog, AuditAction } from '../../entities/auditLog.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let savedLogs: AuditLog[];

  const mockRepo = {
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn(async (log) => {
      savedLogs.push(log);
      return log;
    }),
    find: jest.fn(async () => savedLogs),
  };

  beforeEach(async () => {
    savedLogs = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLog), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  describe('log()', () => {
    it('should save an audit log entry with correct fields', async () => {
      await service.log(1, AuditAction.CREATE, 'tree', 42, null, { tree_code: 'T001' });

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      const saved = savedLogs[0];
      expect(saved.user_id).toBe(1);
      expect(saved.action).toBe(AuditAction.CREATE);
      expect(saved.entity_type).toBe('tree');
      expect(saved.entity_id).toBe(42);
      expect(saved.new_value).toEqual({ tree_code: 'T001' });
    });

    it('should NOT throw when the repository throws', async () => {
      mockRepo.save.mockRejectedValueOnce(new Error('DB connection lost'));

      // Must resolve without throwing
      await expect(
        service.log(1, AuditAction.CREATE, 'tree', 1),
      ).resolves.toBeUndefined();
    });

    it('should strip password from old_value and new_value', async () => {
      await service.log(
        1,
        AuditAction.UPDATE,
        'user',
        5,
        { username: 'alice', password: 'secret' },
        { username: 'alice', password: 'newSecret' },
      );

      const saved = savedLogs[0];
      expect(saved.old_value).not.toHaveProperty('password');
      expect(saved.new_value).not.toHaveProperty('password');
      expect(saved.old_value).toHaveProperty('username', 'alice');
    });

    it('should strip token and access_token from values', async () => {
      await service.log(
        1,
        AuditAction.CREATE,
        'auth',
        null,
        null,
        { access_token: 'jwt.token.here', token: 'abc', userId: 3 },
      );

      const saved = savedLogs[0];
      expect(saved.new_value).not.toHaveProperty('access_token');
      expect(saved.new_value).not.toHaveProperty('token');
      expect(saved.new_value).toHaveProperty('userId', 3);
    });

    it('should handle null old_value and new_value', async () => {
      await service.log(1, AuditAction.DELETE, 'tree', 10, null, null);

      const saved = savedLogs[0];
      expect(saved.old_value).toBeNull();
      expect(saved.new_value).toBeNull();
    });

    it('should store user_id as null for unauthenticated actions', async () => {
      await service.log(null, AuditAction.CREATE, 'auth', null);

      expect(savedLogs[0].user_id).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('should return all logs when no filter is provided', async () => {
      savedLogs = [
        { id: 1, action: AuditAction.CREATE, entity_type: 'tree' } as AuditLog,
        { id: 2, action: AuditAction.UPDATE, entity_type: 'task' } as AuditLog,
      ];

      const result = await service.findAll();
      expect(result.length).toBe(2);
    });

    it('should pass entity_type filter to repository', async () => {
      await service.findAll({ entity_type: 'tree' });

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entity_type: 'tree' }),
        }),
      );
    });

    it('should pass entity_id filter to repository', async () => {
      await service.findAll({ entity_id: 5 });

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entity_id: 5 }),
        }),
      );
    });

    it('should sort results by created_at DESC', async () => {
      await service.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { created_at: 'DESC' },
        }),
      );
    });
  });
});
