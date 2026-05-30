import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { CreateRecurringMaintenanceDto } from './dto/create-recurring-maintenance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** Minimal file descriptor — avoids requiring @types/multer */
interface UploadedFile {
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
  constructor(private readonly maintenanceService: MaintenanceService) {}

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

  @Post('schedules')
  @ApiOperation({ summary: 'Create a recurring maintenance schedule and generate tasks' })
  @ApiResponse({ status: 201, description: 'Recurring tasks successfully generated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Tree, area trees, or user not found.' })
  async createSchedule(
    @Body() createScheduleDto: CreateRecurringMaintenanceDto,
    @Request() req,
  ) {
    const userId = req.user?.userId ?? req.user?.id ?? null;
    return await this.maintenanceService.createRecurringSchedule(
      createScheduleDto,
      userId,
    );
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
  @ApiResponse({
    status: 200,
    description: 'List of tasks assigned to the user.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyTasks(@Request() req) {
    const userId = req.user.userId || req.user.id;
    return await this.maintenanceService.findByUserId(userId);
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
    summary: 'Complete a maintenance task (with geofencing)',
    description:
      'Staff must be within 10 meters of the tree location to complete the task. GPS coordinates are verified against the tree location in the database.',
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
  })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async completeTask(
    @Param('id') id: string,
    @Body() completeDto: CompleteTaskDto,
    @Request() req,
    @UploadedFile() evidenceImage?: UploadedFile,
  ) {
    const userId = req.user.userId || req.user.id;
    return await this.maintenanceService.completeTask(
      +id,
      userId,
      completeDto,
      evidenceImage,
    );
  }
}
