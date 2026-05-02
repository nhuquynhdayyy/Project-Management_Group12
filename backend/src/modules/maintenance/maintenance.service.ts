import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceTask, TaskStatus } from '../../entities/maintenance-task.entity';
import { Tree } from '../../entities/tree.entity';
import { User } from '../auth/user.entity';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

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
