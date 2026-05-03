import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { MaintenanceService } from './maintenance.service';
import { ExportService } from './export.service';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly exportService: ExportService,
  ) {}

  @Post('tasks')
  @ApiOperation({ summary: 'Create a new maintenance task' })
  @ApiResponse({ status: 201, description: 'Task successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Tree or User not found.' })
  async create(@Body() createTaskDto: CreateMaintenanceTaskDto) {
    return await this.maintenanceService.create(createTaskDto);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get all maintenance tasks' })
  @ApiResponse({ status: 200, description: 'List of all tasks.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll() {
    return await this.maintenanceService.findAll();
  }

  @Get('tasks/my-tasks')
  @ApiOperation({ summary: 'Get tasks assigned to the current user' })
  @ApiResponse({ status: 200, description: 'List of tasks assigned to the user.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyTasks(@Request() req) {
    const userId = req.user.userId || req.user.id;
    return await this.maintenanceService.findByUserId(userId);
  }

  @Get('tasks/export')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Export maintenance tasks to Excel or PDF',
    description:
      'Xuất danh sách công việc bảo trì ra file Excel (.xlsx) hoặc PDF. Chỉ Admin và Manager mới có quyền truy cập.',
  })
  @ApiQuery({
    name: 'format',
    required: true,
    enum: ['xlsx', 'pdf'],
    description: 'Định dạng file xuất: xlsx hoặc pdf',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Ngày bắt đầu lọc (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'Ngày kết thúc lọc (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @ApiResponse({ status: 200, description: 'File xuất thành công.' })
  @ApiResponse({ status: 400, description: 'Tham số format không hợp lệ hoặc thiếu.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Chỉ Admin/Manager mới được xuất báo cáo.' })
  async exportTasks(
    @Query('format') format: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const SUPPORTED_FORMATS = ['xlsx', 'pdf'] as const;
    type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

    if (!format || !(SUPPORTED_FORMATS as readonly string[]).includes(format)) {
      throw new BadRequestException(
        `Tham số "format" bắt buộc và phải là một trong: ${SUPPORTED_FORMATS.join(', ')}`,
      );
    }

    const tasks = await this.maintenanceService.getTasksForExport(from, to);

    if ((format as SupportedFormat) === 'xlsx') {
      const buffer = await this.exportService.exportToExcel(tasks);
      const filename = `maintenance-report-${Date.now()}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.end(buffer);
      return;
    }

    // format === 'pdf'
    const buffer = await this.exportService.exportToPdf(tasks);
    const filename = `maintenance-report-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get a maintenance task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async findOne(@Param('id') id: string) {
    return await this.maintenanceService.findById(+id);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status (e.g., start task)' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task status updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not assigned to this task.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTaskStatusDto,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.id;
    return await this.maintenanceService.updateStatus(+id, userId, updateStatusDto);
  }

  @Post('tasks/:id/complete')
  @ApiOperation({
    summary: 'Complete a maintenance task (with geofencing)',
    description:
      'Staff must be within 10 meters of the tree location to complete the task. GPS coordinates are verified against the tree location in the database.',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task completed successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Not assigned to this task, already completed, or outside geofence radius.',
  })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async completeTask(
    @Param('id') id: string,
    @Body() completeDto: CompleteTaskDto,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.id;
    return await this.maintenanceService.completeTask(+id, userId, completeDto);
  }
}
