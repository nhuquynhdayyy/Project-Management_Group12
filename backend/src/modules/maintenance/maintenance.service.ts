import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { MaintenanceTask, TaskStatus } from '../../entities/maintenance-task.entity';
import { Tree } from '../../entities/tree.entity';
import { User } from '../auth/user.entity';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { StaffPerformanceDto } from './dto/staff-performance.dto';

@Injectable()
export class MaintenanceService {
  // Maximum allowed distance in meters for geofencing
  private readonly MAX_DISTANCE_METERS = 10;

  constructor(
    @InjectRepository(MaintenanceTask)
    private readonly taskRepository: Repository<MaintenanceTask>,
    @InjectRepository(Tree)
    private readonly treeRepository: Repository<Tree>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createTaskDto: CreateMaintenanceTaskDto): Promise<MaintenanceTask> {
    // Verify tree exists
    const tree = await this.treeRepository.findOne({
      where: { id: createTaskDto.tree_id },
    });

    if (!tree) {
      throw new NotFoundException('Tree not found');
    }

    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: createTaskDto.assigned_to },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create task
    const task = this.taskRepository.create({
      tree_id: createTaskDto.tree_id,
      assigned_to: createTaskDto.assigned_to,
      task_type: createTaskDto.task_type,
      scheduled_date: new Date(createTaskDto.scheduled_date),
      notes: createTaskDto.notes,
      status: TaskStatus.PENDING,
    });

    return await this.taskRepository.save(task);
  }

  async completeTask(
    taskId: number,
    userId: number,
    completeDto: CompleteTaskDto,
  ): Promise<MaintenanceTask> {
    // Find task with tree relationship
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['tree'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify task is assigned to this user
    if (task.assigned_to !== userId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    // Verify task is not already completed
    if (task.status === TaskStatus.COMPLETED) {
      throw new ForbiddenException('Task is already completed');
    }

    // Geofencing: Verify staff is within 10 meters of the tree
    const distance = this.calculateDistance(
      completeDto.latitude,
      completeDto.longitude,
      task.tree,
    );

    if (distance > this.MAX_DISTANCE_METERS) {
      throw new ForbiddenException(
`You must be within ${this.MAX_DISTANCE_METERS} meters of the tree to complete this task. Current distance: ${distance.toFixed(1)}m`,
      );
    }

    // Update task
    task.status = TaskStatus.COMPLETED;
    task.completed_at = new Date();
    task.evidence_image_url = completeDto.evidence_image_url || null;
    
    // Append completion notes to existing notes
    if (completeDto.notes) {
      task.notes = task.notes 
        ? `${task.notes}\n\nCompletion notes: ${completeDto.notes}`
        : completeDto.notes;
    }

    return await this.taskRepository.save(task);
  }

  async updateStatus(
    taskId: number,
    userId: number,
    updateStatusDto: UpdateTaskStatusDto,
  ): Promise<MaintenanceTask> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify task is assigned to this user
    if (task.assigned_to !== userId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    task.status = updateStatusDto.status;
    return await this.taskRepository.save(task);
  }

  async findByUserId(userId: number): Promise<MaintenanceTask[]> {
    return await this.taskRepository.find({
      where: { assigned_to: userId },
      order: { scheduled_date: 'ASC' },
    });
  }

  async findById(taskId: number): Promise<MaintenanceTask | null> {
    return await this.taskRepository.findOne({
      where: { id: taskId },
    });
  }

  async findAll(): Promise<MaintenanceTask[]> {
    return await this.taskRepository.find({
      order: { scheduled_date: 'ASC' },
    });
  }

  /**
   * Lấy danh sách tasks để export, có thể lọc theo khoảng ngày.
   * Trả về đầy đủ thông tin task kèm tên cây và tên nhân viên.
   */
  async getTasksForExport(from?: string, to?: string): Promise<MaintenanceTask[]> {
    const where: Record<string, any> = {};

    if (from && to) {
      where.scheduled_date = Between(new Date(from), new Date(to));
    } else if (from) {
      where.scheduled_date = MoreThanOrEqual(new Date(from));
    } else if (to) {
      where.scheduled_date = LessThanOrEqual(new Date(to));
    }

    return this.taskRepository.find({
      where,
      relations: ['tree', 'tree.species', 'assignedUser'],
      order: { scheduled_date: 'ASC' },
    });
  }

  async getStaffPerformance(): Promise<StaffPerformanceDto[]> {
    const rows = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.assignedUser', 'user')
      .select('user.username', 'username')
      .addSelect(
        `SUM(CASE WHEN task.status = :completedStatus THEN 1 ELSE 0 END)`,
        'completed',
      )
      .addSelect(
        `SUM(CASE WHEN task.status IN (:...pendingStatuses) THEN 1 ELSE 0 END)`,
        'pending',
      )
      .addSelect(
`AVG(CASE WHEN task.status = :completedStatus AND task.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (task.completed_at - task.created_at)) / 3600 ELSE NULL END)`,
        'avg_completion_hours',
      )
      .setParameter('completedStatus', TaskStatus.COMPLETED)
      .setParameter('pendingStatuses', [TaskStatus.PENDING, TaskStatus.IN_PROGRESS])
      .groupBy('user.username')
      .orderBy('user.username', 'ASC')
      .getRawMany();

    return rows.map((row) => ({
      username: row.username,
      completed: Number(row.completed) || 0,
      pending: Number(row.pending) || 0,
      avg_completion_hours:
        row.avg_completion_hours !== null ? Number(parseFloat(row.avg_completion_hours).toFixed(2)) : null,
    }));
  }

  async getOverdueTasks(): Promise<MaintenanceTask[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await this.taskRepository.find({
      where: {
        scheduled_date: LessThanOrEqual(new Date(today.getTime() - 24 * 60 * 60 * 1000)),
      },
      relations: ['tree', 'assignedUser'],
      order: { scheduled_date: 'ASC' },
    });

    return tasks
      .filter((task) => task.status !== TaskStatus.COMPLETED)
      .map((task) => {
        const scheduled = new Date(task.scheduled_date);
        const diffMs = today.getTime() - scheduled.getTime();
        const overdueDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        return {
          ...task,
          tree_name: task.tree?.tree_code ?? null,
          staff_name: task.assignedUser?.full_name ?? task.assignedUser?.username ?? null,
          overdue_days: overdueDays,
        } as MaintenanceTask;
      });
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in meters
   */
  private calculateDistance(lat1: number, lon1: number, tree: Tree): number {
    // Extract tree coordinates from GeoJSON
    const treeLocation = tree.location as any;
    const lon2 = treeLocation.coordinates[0]; // longitude
    const lat2 = treeLocation.coordinates[1]; // latitude

    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}
