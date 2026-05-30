import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditAction } from '../../entities/auditLog.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

export interface AuditLogFilter {
  user_id?: number;
  action?: AuditAction;
  entity_type?: string;
  entity_id?: number;
  search?: string;
  quick_filter?: string;
  from?: Date;
  to?: Date;
}

export interface ActivityLogFilter extends AuditLogFilter {
  page?: number;
  limit?: number;
}

export interface PaginatedActivityLogs {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function getVietnamWallClockDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Persist an audit log entry.
   * This method NEVER throws — any failure is caught and logged internally
   * so that audit logging never breaks the main business logic.
   */
  async log(
    userId: number | null,
    action: AuditAction,
    entityType: string,
    entityId: number | null,
    oldValue: Record<string, any> | null = null,
    newValue: Record<string, any> | null = null,
    ipAddress: string | null = null,
  ): Promise<void> {
    try {
      const entry = this.auditLogRepository.create({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: this.sanitise(oldValue),
        new_value: this.sanitise(newValue),
        ip_address: ipAddress,
        created_at: getVietnamWallClockDate(),
      });
      await this.auditLogRepository.save(entry);
    } catch (err) {
      // Log the error but do NOT re-throw — audit failures must not affect
      // the main request/response cycle.
      this.logger.error('Failed to write audit log', err);
    }
  }

  /**
   * Query audit logs with optional filters.
   * Results are sorted by created_at DESC.
   * User password is excluded from response for security.
   */
  async findAll(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (filter.entity_type) {
      where.entity_type = filter.entity_type;
    }

    if (filter.user_id !== undefined) {
      where.user_id = filter.user_id;
    }

    if (filter.action) {
      where.action = filter.action;
    }

    if (filter.entity_id !== undefined) {
      where.entity_id = filter.entity_id;
    }

    if (filter.from && filter.to) {
      where.created_at = Between(filter.from, filter.to);
    }

    const logs = await this.auditLogRepository.find({
      where,
      order: { created_at: 'DESC' },
    });

    // Remove password field from eagerly loaded user objects for security
    logs.forEach((log) => {
      if (log.user) {
        delete (log.user as any).password;
      }
    });

    return logs;
  }

  async findActivityLogs(
    filter: ActivityLogFilter = {},
  ): Promise<PaginatedActivityLogs> {
    const page = Math.max(filter.page ?? 1, 1);
    const limit = Math.min(Math.max(filter.limit ?? 10, 1), 100);

    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('1 = 1');

    if (filter.user_id !== undefined) {
      query.andWhere('log.user_id = :userId', { userId: filter.user_id });
    }

    if (filter.action) {
      query.andWhere('log.action = :action', { action: filter.action });
    }

    if (filter.entity_type) {
      query.andWhere('log.entity_type = :entityType', {
        entityType: filter.entity_type,
      });
    }

    if (filter.entity_id !== undefined) {
      query.andWhere('log.entity_id = :entityId', {
        entityId: filter.entity_id,
      });
    }

    switch (filter.quick_filter) {
      case 'auth':
        query.andWhere(
          `(
            log.action IN (:...authActions) OR
            (log.action = :legacyCreateAction AND log.entity_type = :authEntity AND LOWER(CAST(log.new_value AS TEXT)) LIKE :legacyLoginFailed)
          )`,
          {
            authActions: [
              AuditAction.LOGIN,
              AuditAction.LOGOUT,
              AuditAction.LOGIN_FAILED,
            ],
            legacyCreateAction: AuditAction.CREATE,
            authEntity: 'auth',
            legacyLoginFailed: '%login_failed%',
          },
        );
        break;
      case 'tree_changes':
        query.andWhere('log.entity_type = :treeEntity', { treeEntity: 'tree' });
        query.andWhere('log.action IN (:...treeActions)', {
          treeActions: [
            AuditAction.CREATE,
            AuditAction.UPDATE,
            AuditAction.DELETE,
          ],
        });
        break;
      case 'tree_maintenance':
        query.andWhere('log.entity_type IN (:...taskEntities)', {
          taskEntities: ['task', 'maintenance', 'maintenance_task'],
        });
        query.andWhere('log.action IN (:...taskActions)', {
          taskActions: [
            AuditAction.CREATE,
            AuditAction.UPDATE,
            AuditAction.COMPLETE,
            AuditAction.CREATE_TASK,
            AuditAction.UPDATE_TASK,
            AuditAction.CHANGE_STATUS,
            AuditAction.COMPLETE_TASK,
          ],
        });
        break;
      case 'user_management':
        query.andWhere('log.action IN (:...userActions)', {
          userActions: [
            AuditAction.CREATE_USER,
            AuditAction.UPDATE_USER,
            AuditAction.DELETE_USER,
            AuditAction.CHANGE_ROLE,
          ],
        });
        break;
    }

    if (filter.from) {
      query.andWhere('log.created_at >= :from', { from: filter.from });
    }

    if (filter.to) {
      query.andWhere('log.created_at <= :to', { to: filter.to });
    }

    if (filter.search?.trim()) {
      query.andWhere(
        `(
          LOWER(COALESCE(user.username, '')) LIKE :search OR
          LOWER(log.action) LIKE :search OR
          LOWER(log.entity_type) LIKE :search OR
          LOWER(CAST(log.entity_id AS TEXT)) LIKE :search OR
          LOWER(CAST(log.old_value AS TEXT)) LIKE :search OR
          LOWER(CAST(log.new_value AS TEXT)) LIKE :search
        )`,
        { search: `%${filter.search.trim().toLowerCase()}%` },
      );
    }

    const [logs, total] = await query
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    logs.forEach((log) => {
      if (log.user) {
        delete (log.user as any).password;
      }
    });

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Remove sensitive keys from an object before storing.
   * Handles nested objects recursively.
   */
  private sanitise(
    obj: Record<string, any> | null,
  ): Record<string, any> | null {
    if (!obj || typeof obj !== 'object') return obj;

    const SENSITIVE = ['password', 'token', 'access_token', 'refresh_token'];
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE.includes(key)) continue;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.sanitise(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
