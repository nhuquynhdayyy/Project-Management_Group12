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
    createQueryBuilder: jest.fn(),
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

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('log()', () => {
    it('should save an audit log entry with correct fields', async () => {
      await service.log(1, AuditAction.CREATE, 'tree', 42, null, {
        tree_code: 'T001',
      });

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      const saved = savedLogs[0];
      expect(saved.user_id).toBe(1);
      expect(saved.action).toBe(AuditAction.CREATE);
      expect(saved.entity_type).toBe('tree');
      expect(saved.entity_id).toBe(42);
      expect(saved.new_value).toEqual({ tree_code: 'T001' });
    });

    it('should store created_at using Vietnam current time', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-30T01:00:00.000Z'));

      await service.log(1, AuditAction.LOGIN, 'auth', null);

      expect(savedLogs[0].created_at).toEqual(
        new Date('2026-05-30T08:00:00.000Z'),
      );
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
      await service.log(1, AuditAction.CREATE, 'auth', null, null, {
        access_token: 'jwt.token.here',
        token: 'abc',
        userId: 3,
      });

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

  describe('findActivityLogs()', () => {
    const createQueryBuilder = () => {
      const builder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 1,
              action: AuditAction.CREATE,
              entity_type: 'tree',
              user: { id: 1, username: 'admin', password: 'secret' },
            } as AuditLog,
          ],
          1,
        ]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(builder);
      return builder;
    };

    it('should return paginated activity logs with metadata', async () => {
      createQueryBuilder();

      const result = await service.findActivityLogs({ page: 2, limit: 10 });

      expect(result.meta).toEqual({
        total: 1,
        page: 2,
        limit: 10,
        totalPages: 1,
      });
      expect(result.data).toHaveLength(1);
    });

    it('should apply user, action, entity type, search, and date filters', async () => {
      const builder = createQueryBuilder();

      await service.findActivityLogs({
        user_id: 1,
        action: AuditAction.UPDATE,
        entity_type: 'task',
        search: 'TREE-001',
        from: new Date('2026-05-01T00:00:00.000Z'),
        to: new Date('2026-05-31T23:59:59.999Z'),
      });

      expect(builder.andWhere).toHaveBeenCalledWith('log.user_id = :userId', {
        userId: 1,
      });
      expect(builder.andWhere).toHaveBeenCalledWith('log.action = :action', {
        action: AuditAction.UPDATE,
      });
      expect(builder.andWhere).toHaveBeenCalledWith(
        'log.entity_type = :entityType',
        {
          entityType: 'task',
        },
      );
      expect(builder.andWhere).toHaveBeenCalledWith('log.created_at >= :from', {
        from: new Date('2026-05-01T00:00:00.000Z'),
      });
      expect(builder.andWhere).toHaveBeenCalledWith('log.created_at <= :to', {
        to: new Date('2026-05-31T23:59:59.999Z'),
      });
      expect(builder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER'),
        expect.objectContaining({ search: '%tree-001%' }),
      );
    });

    it('should strip user passwords from paginated results', async () => {
      createQueryBuilder();

      const result = await service.findActivityLogs();

      expect((result.data[0].user as any).password).toBeUndefined();
    });
  });
});
