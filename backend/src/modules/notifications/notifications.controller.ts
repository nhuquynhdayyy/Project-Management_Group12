import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a system notification' })
  @ApiResponse({ status: 201, description: 'Notification created.' })
  async create(@Body() dto: CreateNotificationDto, @Request() req) {
    const userId = req.user?.userId ?? req.user?.id ?? null;
    return this.notificationsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user notifications newest first' })
  async findMine(@Request() req) {
    const userId = req.user?.userId ?? req.user?.id;
    return this.notificationsService.findMine(userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@Request() req) {
    const userId = req.user?.userId ?? req.user?.id;
    return { count: await this.notificationsService.countUnread(userId) };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId ?? req.user?.id;
    return this.notificationsService.markRead(+id, userId);
  }
}
