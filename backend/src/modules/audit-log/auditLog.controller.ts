import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuditLogService } from './auditLog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditAction } from '../../entities/auditLog.entity';

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
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'ISO date string',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'ISO date string',
  })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs sorted by created_at DESC.',
  })
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
    // Kiểm tra không phân biệt hoa thường
    const isAdmin = roles.some(role => role.toLowerCase() === 'admin');
    
    if (!isAdmin) {
      throw new ForbiddenException('Admin role required to access audit logs');
    }

    return this.auditLogService.findAll({
      action: undefined,
      entity_type: entityType,
      entity_id: entityId ? parseInt(entityId, 10) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get paginated activity logs (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'user_id', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'entity_type', required: false, type: String })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'ISO date string',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'ISO date string',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated activity logs sorted by created_at DESC.',
  })
  async findActivityLogs(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('user_id') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('entity_type') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const roles: string[] = req.user?.roles ?? [];
    const isAdmin = roles.some(role => role.toLowerCase() === 'admin');
    
    if (!isAdmin) {
      throw new ForbiddenException('Admin role required to access audit logs');
    }

    return this.auditLogService.findActivityLogs({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      user_id: userId ? parseInt(userId, 10) : undefined,
      action,
      entity_type: entityType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}
