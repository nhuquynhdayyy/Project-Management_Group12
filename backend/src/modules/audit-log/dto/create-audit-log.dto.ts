import { AuditAction } from '../../../entities/auditLog.entity';

export class CreateAuditLogDto {
  userId?: number | null;
  action: AuditAction;
  entityType: string;
  entityId?: number | null;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string | null;
}
