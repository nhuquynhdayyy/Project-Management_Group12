import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './auditLog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs (Admin only)' })
  @ApiQuery({ name: 'entity_type', required: false, type: String })
  @ApiQuery({ name: 'entity_id', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'ISO date string' })
  @ApiResponse({ status: 200, description: 'List of audit logs sorted by created_at DESC.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin role required.' })
  async findAll(
    @Request() req,
    @Query('entity_type') entityType?: string,
    @Query('entity_id') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Only users with the 'admin' role may access audit logs
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('admin')) {
      throw new ForbiddenException('Admin role required to access audit logs');
    }

    return this.auditLogService.findAll({
      entity_type: entityType,
      entity_id: entityId ? parseInt(entityId, 10) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}
