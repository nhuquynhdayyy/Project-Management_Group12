import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaintenanceService } from './maintenance.service';
import {
  MaintenanceTask,
  TaskType,
  TaskStatus,
} from '../../entities/maintenance-task.entity';
import { Tree } from '../../entities/tree.entity';
import { User } from '../auth/user.entity';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditLog } from '../../entities/auditLog.entity';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';

describe('MaintenanceService', () => {
  let service: MaintenanceService;

  const mockTaskRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTreeRepository = {
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockAuditLogService = {
    log: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: getRepositoryToken(MaintenanceTask),
          useValue: mockTaskRepository,
        },
        { provide: getRepositoryToken(Tree), useValue: mockTreeRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        // Provide AuditLogService as a plain value — NestJS will not try to
        // instantiate it, so its own @InjectRepository(AuditLog) dependency
        // is never resolved and the circular scan is avoided.
        { provide: AuditLogService, useValue: mockAuditLogService },
        // AuditLogService's constructor metadata still lists AuditLog repo as
        // a dependency token. Providing it here satisfies the DI scanner.
        { provide: getRepositoryToken(AuditLog), useValue: {} },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a maintenance task', async () => {
      // Arrange
      const createTaskDto: CreateMaintenanceTaskDto = {
        tree_id: 1,
        assigned_to: 2,
        task_type: TaskType.PRUNING,
        scheduled_date: '2026-05-15',
        notes: 'Urgent pruning needed',
      };

      const mockTree = {
        id: 1,
        tree_code: 'TREE001',
        location: {
          type: 'Point',
          coordinates: [108.2022, 16.0544],
        },
      };

      const mockUser = {
        id: 2,
        username: 'field_worker',
        role: 'field_worker',
      };

      const mockTask = {
        id: 1,
        ...createTaskDto,
        status: TaskStatus.PENDING,
        tree: mockTree,
        assignedUser: mockUser,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTreeRepository.findOne.mockResolvedValue(mockTree);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      // Act
      const result = await service.create(createTaskDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.tree_id).toBe(1);
      expect(result.assigned_to).toBe(2);
      expect(result.task_type).toBe(TaskType.PRUNING);
      expect(result.status).toBe(TaskStatus.PENDING);
      expect(mockTreeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should fail if tree does not exist', async () => {
      // Arrange
      const createTaskDto: CreateMaintenanceTaskDto = {
        tree_id: 999,
        assigned_to: 2,
        task_type: TaskType.PRUNING,
        scheduled_date: '2026-05-15',
      };

      mockTreeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createTaskDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createTaskDto)).rejects.toThrow(
        'Tree not found',
      );
    });

    it('should fail if user does not exist', async () => {
      // Arrange
      const createTaskDto: CreateMaintenanceTaskDto = {
        tree_id: 1,
        assigned_to: 999,
        task_type: TaskType.PRUNING,
        scheduled_date: '2026-05-15',
      };

      const mockTree = { id: 1, tree_code: 'TREE001' };
      mockTreeRepository.findOne.mockResolvedValue(mockTree);
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createTaskDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createTaskDto)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('completeTask - Geofencing', () => {
    it('should fail to complete task if staff is > 10m away from tree', async () => {
      // Arrange
      const taskId = 1;
      const userId = 2;

      // Tree location: Đà Nẵng City Hall
      const mockTree = {
        id: 1,
        tree_code: 'TREE001',
        location: {
          type: 'Point',
          coordinates: [108.2022, 16.0544], // [lng, lat]
        },
      };

      const mockTask = {
        id: taskId,
        tree_id: 1,
        assigned_to: userId,
        status: TaskStatus.IN_PROGRESS,
        tree: mockTree,
      };

      // Staff location: 50 meters away (should fail)
      const completeDto: CompleteTaskDto = {
        latitude: 16.0549, // ~55 meters north
        longitude: 108.2022,
        notes: 'Task completed',
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      // Act & Assert
      await expect(
        service.completeTask(taskId, userId, completeDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.completeTask(taskId, userId, completeDto),
      ).rejects.toThrow(
        'You must be within 10 meters of the tree to complete this task',
      );
    });

    it('should succeed to complete task if staff is < 10m away from tree', async () => {
      // Arrange
      const taskId = 1;
      const userId = 2;

      // Tree location
      const mockTree = {
        id: 1,
        tree_code: 'TREE001',
        location: {
          type: 'Point',
          coordinates: [108.2022, 16.0544],
        },
      };

      const mockTask = {
        id: taskId,
        tree_id: 1,
        assigned_to: userId,
        status: TaskStatus.IN_PROGRESS,
        tree: mockTree,
      };

      // Staff location: 5 meters away (should succeed)
      const completeDto: CompleteTaskDto = {
        latitude: 16.05444, // ~4.4 meters north
        longitude: 108.2022,
        evidence_image_url: 'https://storage.example.com/evidence.jpg',
        notes: 'Task completed successfully',
      };

      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completed_at: new Date(),
        evidence_image_url: completeDto.evidence_image_url,
        notes: completeDto.notes,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(completedTask);

      // Act
      const result = await service.completeTask(taskId, userId, completeDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.completed_at).toBeDefined();
      expect(result.evidence_image_url).toBe(completeDto.evidence_image_url);
      expect(mockTaskRepository.save).toHaveBeenCalled();
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        userId,
        'COMPLETE',
        'task',
        taskId,
        expect.objectContaining({ status: TaskStatus.IN_PROGRESS }),
        expect.objectContaining({ status: TaskStatus.COMPLETED }),
      );
    });

    it('should fail if task is not assigned to the user', async () => {
      // Arrange
      const taskId = 1;
      const userId = 2;
      const wrongUserId = 3;

      const mockTask = {
        id: taskId,
        assigned_to: wrongUserId, // Different user
        status: TaskStatus.IN_PROGRESS,
      };

      const completeDto: CompleteTaskDto = {
        latitude: 16.0544,
        longitude: 108.2022,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      // Act & Assert
      await expect(
        service.completeTask(taskId, userId, completeDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.completeTask(taskId, userId, completeDto),
      ).rejects.toThrow('You are not assigned to this task');
    });

    it('should fail if task is already completed', async () => {
      // Arrange
      const taskId = 1;
      const userId = 2;

      const mockTask = {
        id: taskId,
        assigned_to: userId,
        status: TaskStatus.COMPLETED, // Already completed
      };

      const completeDto: CompleteTaskDto = {
        latitude: 16.0544,
        longitude: 108.2022,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      // Act & Assert
      await expect(
        service.completeTask(taskId, userId, completeDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.completeTask(taskId, userId, completeDto),
      ).rejects.toThrow('Task is already completed');
    });
  });

  describe('findByUserId', () => {
    it('should return tasks assigned to a specific user', async () => {
      // Arrange
      const userId = 2;
      const mockTasks = [
        {
          id: 1,
          assigned_to: userId,
          task_type: TaskType.PRUNING,
          status: TaskStatus.PENDING,
        },
        {
          id: 2,
          assigned_to: userId,
          task_type: TaskType.WATERING,
          status: TaskStatus.IN_PROGRESS,
        },
      ];

      mockTaskRepository.find.mockResolvedValue(mockTasks);

      // Act
      const result = await service.findByUserId(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(mockTaskRepository.find).toHaveBeenCalledWith({
        where: { assigned_to: userId },
        order: { scheduled_date: 'ASC' },
      });
    });
  });

  describe('findById', () => {
    it('should return a task by id', async () => {
      // Arrange
      const taskId = 1;
      const mockTask = {
        id: taskId,
        task_type: TaskType.PRUNING,
        status: TaskStatus.PENDING,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      // Act
      const result = await service.findById(taskId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(taskId);
      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { id: taskId },
      });
    });

    it('should return null if task not found', async () => {
      // Arrange
      mockTaskRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findById(999);

      // Assert
      expect(result).toBeNull();
    });
  });
});
