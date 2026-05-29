import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { MaintenanceTask, TaskStatus } from '../../entities/maintenance-task.entity';
import { Tree } from '../../entities/tree.entity';
import { User } from '../auth/user.entity';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { StaffPerformanceDto } from './dto/staff-performance.dto';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditAction } from '../../entities/auditLog.entity';
import { CloudStorageService } from '../../services/cloud-storage.service';

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
    private readonly cloudStorageService: CloudStorageService,
  ) {}

  /**
   * Tạo nhiệm vụ bảo trì mới và ghi lại nhật ký hệ thống (Audit Log)
   */
  async create(createTaskDto: CreateMaintenanceTaskDto, userId?: number): Promise<MaintenanceTask> {
    const tree = await this.treeRepository.findOne({ where: { id: createTaskDto.tree_id } });
    if (!tree) throw new NotFoundException('Tree not found');

    const user = await this.userRepository.findOne({ where: { id: createTaskDto.assigned_to } });
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

    // Ghi log bảo mật: Ai đã tạo task cho ai
    await this.auditLogService.log(
      userId ?? null, AuditAction.CREATE, 'task', saved.id, null,
      { tree_id: saved.tree_id, assigned_to: saved.assigned_to, task_type: saved.task_type },
    );

    return saved;
  }

  /**
   * Hoàn thành nhiệm vụ: Kiểm tra GPS, Tải ảnh lên Cloud, Xác thực người dùng và Ghi log truy vết
   */
  async completeTask(
    taskId: number,
    userId: number,
    completeDto: CompleteTaskDto,
    imageFile?: Express.Multer.File,
  ): Promise<MaintenanceTask> {
    const task = await this.taskRepository.findOne({ 
      where: { id: taskId }, 
      relations: ['tree'] 
    });

    if (!task) throw new NotFoundException('Task not found');

    // Kiểm tra quyền: Chỉ người được giao mới được hoàn thành
    if (task.assigned_to !== userId) {
      await this.auditLogService.log(userId, AuditAction.UPDATE, 'task', taskId, null, { error: 'UNAUTHORIZED_ASSIGNMENT_ATTEMPT' });
      throw new ForbiddenException('You are not assigned to this task');
    }

    if (task.status === TaskStatus.COMPLETED) {
      throw new ForbiddenException('Task is already completed');
    }

    // Kiểm tra khoảng cách địa lý (Geofencing)
    const distance = this.calculateDistance(completeDto.latitude, completeDto.longitude, task.tree);
    if (distance > this.MAX_DISTANCE_METERS) {
      await this.auditLogService.log(
        userId, AuditAction.UPDATE, 'task', taskId,
        { status: task.status },
        { 
          error: 'GEOFENCE_FAIL', 
          distance: parseFloat(distance.toFixed(1)), 
          maxAllowed: this.MAX_DISTANCE_METERS,
          gps: { lat: completeDto.latitude, lng: completeDto.longitude } 
        },
      );
      throw new ForbiddenException(`Bạn ở quá xa cây (${distance.toFixed(1)}m). Vui lòng di chuyển đến gần trong vòng ${this.MAX_DISTANCE_METERS}m.`);
    }

    // Tải ảnh lên Cloud Storage (nếu có ảnh đính kèm)
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await this.cloudStorageService.uploadImage(imageFile.buffer, imageFile.originalname);
    }

    // Cập nhật trạng thái nhiệm vụ
    const oldValue = { status: task.status, evidence_image_url: task.evidence_image_url };
    task.status = TaskStatus.COMPLETED;
    task.completed_at = new Date();
    task.evidence_image_url = imageUrl || task.evidence_image_url;
    
    if (completeDto.notes) {
      task.notes = task.notes ? `${task.notes}\n\n[Completion Notes]: ${completeDto.notes}` : completeDto.notes;
    }

    const updated = await this.taskRepository.save(task);

    // Ghi log bảo mật thành công kèm tọa độ xác thực
    await this.auditLogService.log(
      userId, AuditAction.UPDATE, 'task', taskId, oldValue,
      { 
        status: updated.status, 
        completed_at: updated.completed_at, 
        gps_verified: { lat: completeDto.latitude, lng: completeDto.longitude },
        image_stored: !!imageUrl 
      }
    );

    return updated;
  }

  async updateStatus(taskId: number, userId: number, updateStatusDto: UpdateTaskStatusDto): Promise<MaintenanceTask> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.assigned_to !== userId) throw new ForbiddenException('You are not assigned to this task');

    const oldValue = { status: task.status };
    task.status = updateStatusDto.status;
    const updated = await this.taskRepository.save(task);

    await this.auditLogService.log(userId, AuditAction.UPDATE, 'task', taskId, oldValue, { status: updated.status });
    return updated;
  }

  async findByUserId(userId: number): Promise<MaintenanceTask[]> {
    return await this.taskRepository.find({
      where: { assigned_to: userId },
      relations: ['tree', 'tree.species'],
      order: { scheduled_date: 'ASC' },
    });
  }

  async findById(taskId: number): Promise<MaintenanceTask | null> {
    return await this.taskRepository.findOne({ 
      where: { id: taskId }, 
      relations: ['assignedUser', 'tree', 'tree.species'] 
    });
  }

  async findAll(): Promise<MaintenanceTask[]> {
    return await this.taskRepository.find({
      relations: ['assignedUser', 'tree'],
      order: { scheduled_date: 'ASC' },
    });
  }

  async findByTreeId(treeId: number): Promise<MaintenanceTask[]> {
    return await this.taskRepository.find({
      where: { tree_id: treeId },
      relations: ['assignedUser'],
      order: { scheduled_date: 'DESC' },
    });
  }

  async getTasksForExport(from?: string, to?: string): Promise<MaintenanceTask[]> {
    const where: any = {};
    if (from && to) where.scheduled_date = Between(new Date(from), new Date(to));
    else if (from) where.scheduled_date = MoreThanOrEqual(new Date(from));
    else if (to) where.scheduled_date = LessThanOrEqual(new Date(to));

    return this.taskRepository.find({
      where,
      relations: ['tree', 'tree.species', 'assignedUser'],
      order: { scheduled_date: 'ASC' },
    });
  }

  /**
   * Tính toán hiệu suất chi tiết của nhân viên (Full Query Logic)
   */
  async getStaffPerformance(): Promise<StaffPerformanceDto[]> {
    const rows = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.assignedUser', 'user')
      .select('user.username', 'username')
      .addSelect('COUNT(task.id)', 'total_assigned')
      .addSelect(`SUM(CASE WHEN task.status = :completed THEN 1 ELSE 0 END)`, 'completed')
      .addSelect(`SUM(CASE WHEN task.status IN (:...pending) THEN 1 ELSE 0 END)`, 'pending')
      .addSelect(`AVG(CASE WHEN task.status = :completed AND task.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (task.completed_at - task.created_at)) / 3600 ELSE NULL END)`, 'avg_completion_hours')
      .addSelect(`SUM(CASE WHEN task.status = :completed AND DATE(task.completed_at) <= task.scheduled_date THEN 1 ELSE 0 END)`, 'on_time_count')
      .addSelect(`AVG(CASE WHEN task.status = :completed AND DATE(task.completed_at) > task.scheduled_date THEN DATE_PART('day', task.completed_at::timestamp - task.scheduled_date::timestamp) ELSE 0 END)`, 'avg_days_late')
      .addSelect(`COUNT(DISTINCT CASE WHEN task.status = :completed THEN task.task_type ELSE NULL END)`, 'diversity_score')
      .setParameter('completed', TaskStatus.COMPLETED)
      .setParameter('pending', [TaskStatus.PENDING, TaskStatus.IN_PROGRESS])
      .groupBy('user.username')
      .getRawMany();

    return rows.map(row => {
      const completed = Number(row.completed) || 0;
      const onTime = Number(row.on_time_count) || 0;
      
      return {
        username: row.username ?? 'Unknown',
        completed: completed,
        pending: Number(row.pending) || 0,
        avg_completion_hours: row.avg_completion_hours ? Number(parseFloat(row.avg_completion_hours).toFixed(2)) : null,
        onTimeRate: completed > 0 ? Number(((onTime / completed) * 100).toFixed(2)) : 0,
        avgDaysLate: row.avg_days_late ? Number(parseFloat(row.avg_days_late).toFixed(1)) : 0,
        diversityScore: Number(row.diversity_score) || 0,
        activeDays: 0,
        overdueCount: Number(row.overdue_count) || 0, 
      };
    });
  }

  async getOverdueTasks(): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await this.taskRepository.find({
      where: { 
        scheduled_date: LessThanOrEqual(new Date(today.getTime() - 86400000)),
      },
      relations: ['tree', 'assignedUser'],
    });

    return tasks
      .filter(t => t.status !== TaskStatus.COMPLETED)
      .map(t => ({
        ...t,
        overdue_days: Math.floor((today.getTime() - new Date(t.scheduled_date).getTime()) / 86400000),
        staff_name: t.assignedUser?.full_name || t.assignedUser?.username || 'N/A'
      }));
  }

  /**
   * Công thức Haversine để tính khoảng cách giữa người dùng và cây (mét)
   */
  private calculateDistance(lat1: number, lon1: number, tree: Tree): number {
    const loc = tree.location as any;
    if (!loc || !loc.coordinates) return 999999; // Trường hợp không có tọa độ cây

    const lon2 = loc.coordinates[0];
    const lat2 = loc.coordinates[1];
    const R = 6371e3; // Bán kính Trái Đất (mét)
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}