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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { MaintenanceService } from './maintenance.service';
import { ExportService } from './export.service';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { StaffPerformanceDto } from './dto/staff-performance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

/** Minimal file descriptor — avoids requiring @types/multer */
interface UploadedFileInterface {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
}

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
  async create(
    @Body() createTaskDto: CreateMaintenanceTaskDto,
    @Request() req,
  ) {
    const userId = req.user?.userId ?? req.user?.id ?? null;
    return await this.maintenanceService.create(createTaskDto, userId);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get all maintenance tasks' })
  @ApiResponse({ status: 200, description: 'List of all tasks.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Query('tree_id') treeId?: string) {
    if (treeId) {
      return await this.maintenanceService.findByTreeId(+treeId);
    }
    return await this.maintenanceService.findAll();
  }

  @Get('tasks/my-tasks')
  @ApiOperation({ summary: 'Get tasks assigned to the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of tasks assigned to the user.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyTasks(@Request() req) {
    const userId = req.user.userId || req.user.id;
    return await this.maintenanceService.findByUserId(userId);
  }

  @Get('stats/by-staff')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get staff performance statistics',
    description: 'Thống kê hiệu suất nhân viên bảo trì gồm số task hoàn thành và thời gian trung bình.',
  })
  @ApiResponse({ status: 200, type: StaffPerformanceDto, isArray: true })
  async getStaffPerformance() {
    return await this.maintenanceService.getStaffPerformance();
  }

  @Get('stats/overdue')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get overdue maintenance tasks' })
  @ApiResponse({ status: 200, description: 'Danh sách task quá hạn.' })
  async getOverdueTasks() {
    return await this.maintenanceService.getOverdueTasks();
  }

  @Get('tasks/export')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Export maintenance tasks to Excel or PDF' })
  @ApiQuery({ name: 'format', required: true, enum: ['xlsx', 'pdf'] })
  async exportTasks(
    @Query('format') format: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const SUPPORTED_FORMATS = ['xlsx', 'pdf'] as const;
    if (!format || !(SUPPORTED_FORMATS as readonly string[]).includes(format)) {
      throw new BadRequestException(`Format phải là xlsx hoặc pdf`);
    }

    const tasks = await this.maintenanceService.getTasksForExport(from, to);

    if (format === 'xlsx') {
      const buffer = await this.exportService.exportToExcel(tasks);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="report-${Date.now()}.xlsx"`);
      res.end(buffer);
    } else {
      const buffer = await this.exportService.exportToPdf(tasks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report-${Date.now()}.pdf"`);
      res.end(buffer);
    }
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get a maintenance task by ID' })
  async findOne(@Param('id') id: string) {
    return await this.maintenanceService.findById(+id);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTaskStatusDto,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.id;
    return await this.maintenanceService.updateStatus(
      +id,
      userId,
      updateStatusDto,
    );
  }

  @Post('tasks/:id/complete')
  @UseInterceptors(FileInterceptor('evidence_image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Complete a maintenance task (with geofencing and evidence image upload)',
    description: 'Nhân viên phải ở trong bán kính cho phép và tải lên hình ảnh minh chứng.',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 201,
    description: 'Task completed successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description:
      'Not assigned to this task, already completed, or outside geofence radius.',
  }) // Đã sửa: Thêm dấu đóng ngoặc ở đây
  @ApiBody({
    schema: {
      type: 'object',
      required: ['latitude', 'longitude'],
      properties: {
        latitude: { type: 'number', example: 16.0544 },
        longitude: { type: 'number', example: 108.2022 },
        notes: { type: 'string', example: 'Đã bảo trì xong, cây phát triển tốt.' },
        evidence_image: { type: 'string', format: 'binary', description: 'Ảnh minh chứng' },
      },
    },
  })
  async completeTask(
    @Param('id') id: string,
    @Body() completeDto: CompleteTaskDto,
    @Request() req,
    @UploadedFile() evidenceImage: any, // Đã sửa: Đổi 'file' thành 'evidenceImage' cho đồng bộ
  ) {
    const userId = req.user.userId || req.user.id;
    
    // Gọi service với các tham số đã chuẩn hóa
    return await this.maintenanceService.completeTask(
      +id,
      userId,
      completeDto,
      evidenceImage,
    );
  }
}