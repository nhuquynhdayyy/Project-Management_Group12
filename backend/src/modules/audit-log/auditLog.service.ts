import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditAction } from '../../entities/auditLog.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

export interface AuditLogFilter {
  entity_type?: string;
  entity_id?: number;
  from?: Date;
  to?: Date;
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
    logs.forEach(log => {
      if (log.user) {
        delete (log.user as any).password;
      }
    });

    return logs;
  }

  /**
   * Remove sensitive keys from an object before storing.
   * Handles nested objects recursively.
   */
  private sanitise(obj: Record<string, any> | null): Record<string, any> | null {
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
