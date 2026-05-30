import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MaintenanceTask,
  TaskStatus,
} from '../../entities/maintenance-task.entity';
import { Tree } from '../../entities/tree.entity';
import { User } from '../auth/user.entity';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import {
  CreateRecurringMaintenanceDto,
  RecurrenceFrequency,
} from './dto/create-recurring-maintenance.dto';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditAction } from '../../entities/auditLog.entity';
import { NotificationsService } from '../notifications/notifications.service';

/** Minimal file descriptor — avoids requiring @types/multer */
interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
}

@Injectable()
export class MaintenanceService {
  private readonly MAX_DISTANCE_METERS = 10;

  constructor(
    @InjectRepository(MaintenanceTask)
    private readonly taskRepository: Repository<MaintenanceTask>,
    @InjectRepository(Tree)
    private readonly treeRepository: Repository<Tree>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    createTaskDto: CreateMaintenanceTaskDto,
    userId?: number,
  ): Promise<MaintenanceTask> {
    const tree = await this.treeRepository.findOne({
      where: { id: createTaskDto.tree_id },
    });
    if (!tree) throw new NotFoundException('Tree not found');

    const user = await this.userRepository.findOne({
      where: { id: createTaskDto.assigned_to },
    });
    if (!user) throw new NotFoundException('User not found');

    const task = this.taskRepository.create({
      tree_id: createTaskDto.tree_id,
      assigned_to: createTaskDto.assigned_to,
      task_type: createTaskDto.task_type,
      scheduled_date: new Date(createTaskDto.scheduled_date),
      notes: createTaskDto.notes,
      status: TaskStatus.PENDING,
    });

    const saved = await this.taskRepository.save(task);

    await this.auditLogService.log(
      userId ?? null,
      AuditAction.CREATE,
      'task',
      saved.id,
      null,
      {
        tree_id: saved.tree_id,
        assigned_to: saved.assigned_to,
        task_type: saved.task_type,
      },
    );

    return saved;
  }

  async createRecurringSchedule(
    dto: CreateRecurringMaintenanceDto,
    userId?: number,
  ): Promise<{ created: number; tasks: MaintenanceTask[] }> {
    const user = await this.userRepository.findOne({
      where: { id: dto.assigned_to },
    });
    if (!user) throw new NotFoundException('User not found');

    const trees = await this.findScheduleTrees(dto);
    if (trees.length === 0) throw new NotFoundException('No trees found');

    const tasks = trees.flatMap((tree) =>
      Array.from({ length: dto.occurrences }, (_, index) =>
        this.taskRepository.create({
          tree_id: tree.id,
          assigned_to: dto.assigned_to,
          task_type: dto.task_type,
          scheduled_date: this.addRecurrence(
            new Date(dto.start_date),
            dto.frequency,
            index,
          ),
          notes: dto.notes,
          status: TaskStatus.PENDING,
        }),
      ),
    );

    const saved = await this.taskRepository.save(tasks);

    await this.auditLogService.log(
      userId ?? null,
      AuditAction.CREATE,
      'maintenance_schedule',
      null,
      null,
      {
        tree_id: dto.tree_id ?? null,
        area_id: dto.area_id ?? null,
        assigned_to: dto.assigned_to,
        task_type: dto.task_type,
        frequency: dto.frequency,
        occurrences: dto.occurrences,
        generated_tasks: saved.length,
      },
    );

    const firstDate = new Date(dto.start_date).toLocaleDateString('vi-VN');
    await this.notificationsService.notifyUsers(
      [dto.assigned_to],
      'Lịch bảo trì mới',
      `Bạn được giao ${saved.length} công việc ${dto.task_type}, bắt đầu từ ${firstDate}. Nhắc trước ${dto.reminder_minutes ?? 60} phút.`,
      userId ?? null,
    );

    return { created: saved.length, tasks: saved };
  }

  async completeTask(
    taskId: number,
    userId: number,
    completeDto: CompleteTaskDto,
    evidenceImage?: UploadedFile,
  ): Promise<MaintenanceTask> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['tree'],
    });
    if (!task) throw new NotFoundException('Task not found');

    if (task.assigned_to !== userId) {
      await this.auditLogService.log(
        userId,
        AuditAction.UPDATE,
        'task',
        taskId,
        null,
        { error: 'Not assigned to this task' },
      );
      throw new ForbiddenException('You are not assigned to this task');
    }

    if (task.status === TaskStatus.COMPLETED) {
      throw new ForbiddenException('Task is already completed');
    }

    const distance = this.calculateDistance(
      completeDto.latitude,
      completeDto.longitude,
      task.tree,
    );

    if (distance > this.MAX_DISTANCE_METERS) {
      // Fire-and-forget geofence failure log
      await this.auditLogService.log(
        userId,
        AuditAction.UPDATE,
        'task',
        taskId,
        { status: task.status },
        {
          error: 'GEOFENCE_FAIL',
          distance: parseFloat(distance.toFixed(1)),
          maxDistance: this.MAX_DISTANCE_METERS,
          gps: {
            latitude: completeDto.latitude,
            longitude: completeDto.longitude,
          },
        },
      );
      throw new ForbiddenException(
        `You must be within ${this.MAX_DISTANCE_METERS} meters of the tree to complete this task. Current distance: ${distance.toFixed(1)}m`,
      );
    }

    const oldValue = { status: task.status };
    task.status = TaskStatus.COMPLETED;
    task.completed_at = new Date();
    task.evidence_image_url =
      completeDto.evidence_image_url ||
      (evidenceImage ? this.generateEvidenceImageUrl(evidenceImage) : null);
    if (completeDto.notes) {
      task.notes = task.notes
        ? `${task.notes}\n\nCompletion notes: ${completeDto.notes}`
        : completeDto.notes;
    }

    const updated = await this.taskRepository.save(task);

    await this.auditLogService.log(
      userId,
      AuditAction.COMPLETE,
      'task',
      taskId,
      oldValue,
      {
        status: updated.status,
        completed_at: updated.completed_at,
        gps: {
          latitude: completeDto.latitude,
          longitude: completeDto.longitude,
        },
      },
    );

    return updated;
  }

  private generateEvidenceImageUrl(file: UploadedFile): string {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
    return `https://fake-storage.example.com/evidence/${Date.now()}-${safeName}`;
  }

  async updateStatus(
    taskId: number,
    userId: number,
    updateStatusDto: UpdateTaskStatusDto,
  ): Promise<MaintenanceTask> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.assigned_to !== userId)
      throw new ForbiddenException('You are not assigned to this task');

    const oldValue = { status: task.status };
    task.status = updateStatusDto.status;
    const updated = await this.taskRepository.save(task);

    await this.auditLogService.log(
      userId,
      AuditAction.UPDATE,
      'task',
      taskId,
      oldValue,
      { status: updated.status },
    );

    return updated;
  }

  async findByUserId(userId: number): Promise<MaintenanceTask[]> {
    return await this.taskRepository.find({
      where: { assigned_to: userId },
      order: { scheduled_date: 'ASC' },
    });
  }

  async findById(taskId: number): Promise<MaintenanceTask | null> {
    return await this.taskRepository.findOne({ where: { id: taskId } });
  }

  async findAll(): Promise<MaintenanceTask[]> {
    return await this.taskRepository.find({ order: { scheduled_date: 'ASC' } });
  }

  private async findScheduleTrees(dto: CreateRecurringMaintenanceDto) {
    if (dto.tree_id) {
      const tree = await this.treeRepository.findOne({
        where: { id: dto.tree_id },
      });
      return tree ? [tree] : [];
    }

    return this.treeRepository.find({
      where: { area_id: dto.area_id },
      order: { tree_code: 'ASC' },
    });
  }

  private addRecurrence(
    startDate: Date,
    frequency: RecurrenceFrequency,
    index: number,
  ): Date {
    const next = new Date(startDate);
    if (frequency === RecurrenceFrequency.DAILY) {
      next.setDate(next.getDate() + index);
    } else if (frequency === RecurrenceFrequency.WEEKLY) {
      next.setDate(next.getDate() + index * 7);
    } else {
      next.setMonth(next.getMonth() + index);
    }
    return next;
  }

  private calculateDistance(lat1: number, lon1: number, tree: Tree): number {
    const loc = tree.location as any;
    const lon2 = loc.coordinates[0];
    const lat2 = loc.coordinates[1];
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dp / 2) ** 2 +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
