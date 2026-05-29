import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceTask, TaskType, TaskStatus } from '../../entities/maintenance-task.entity';
import { Tree } from '../../entities/tree.entity';
import { User } from '../auth/user.entity';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditLog } from '../../entities/auditLog.entity';
import { CloudStorageService } from '../../services/cloud-storage.service';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let taskRepository: Repository<MaintenanceTask>;
  let treeRepository: Repository<Tree>;
  let userRepository: Repository<User>;
  let cloudStorageService: CloudStorageService;
  let auditLogService: AuditLogService;

  const mockTaskRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
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

  const mockCloudStorageService = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: getRepositoryToken(MaintenanceTask),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(Tree),
          useValue: mockTreeRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        // CloudStorageService phục vụ upload ảnh (từ main)
        {
          provide: CloudStorageService,
          useValue: mockCloudStorageService,
        },
        // AuditLogService phục vụ truy vết bảo mật (từ phase-3)
        // Cung cấp dưới dạng useValue để tránh lỗi vòng lặp DI (circular dependency)
        { 
          provide: AuditLogService, 
          useValue: mockAuditLogService 
        },
        // Mock Repository này để thỏa mãn dependency scanner của NestJS
        { 
          provide: getRepositoryToken(AuditLog), 
          useValue: {} 
        },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
    taskRepository = module.get<Repository<MaintenanceTask>>(getRepositoryToken(MaintenanceTask));
    treeRepository = module.get<Repository<Tree>>(getRepositoryToken(Tree));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    cloudStorageService = module.get<CloudStorageService>(CloudStorageService);
    auditLogService = module.get<AuditLogService>(AuditLogService);
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
      expect(mockTreeRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 2 } });
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
      await expect(service.create(createTaskDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createTaskDto)).rejects.toThrow('Tree not found');
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
      await expect(service.create(createTaskDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createTaskDto)).rejects.toThrow('User not found');
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
      await expect(service.completeTask(taskId, userId, completeDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.completeTask(taskId, userId, completeDto)).rejects.toThrow(
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
        notes: 'Task completed successfully',
      };

      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completed_at: new Date(),
        evidence_image_url: null,
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
      expect(result.evidence_image_url).toBeNull();
      expect(mockTaskRepository.save).toHaveBeenCalled();
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
      await expect(service.completeTask(taskId, userId, completeDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.completeTask(taskId, userId, completeDto)).rejects.toThrow(
        'You are not assigned to this task',
      );
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
      await expect(service.completeTask(taskId, userId, completeDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.completeTask(taskId, userId, completeDto)).rejects.toThrow(
        'Task is already completed',
      );
    });

    it('should upload image and save URL when image file is provided', async () => {
      // Arrange
      const taskId = 1;
      const userId = 2;

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

      const completeDto: CompleteTaskDto = {
        latitude: 16.05444,
        longitude: 108.2022,
        notes: 'Task completed with image',
      };

      const mockImageFile = {
        buffer: Buffer.from('fake-image-data'),
        originalname: 'evidence.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const mockImageUrl = 'https://test.supabase.co/storage/v1/object/public/test-bucket/1234567890_evidence.jpg';

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockCloudStorageService.uploadImage.mockResolvedValue(mockImageUrl);
      mockTaskRepository.save.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completed_at: new Date(),
        evidence_image_url: mockImageUrl,
      });

      // Act
      const result = await service.completeTask(taskId, userId, completeDto, mockImageFile);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.evidence_image_url).toBe(mockImageUrl);
      expect(mockCloudStorageService.uploadImage).toHaveBeenCalledWith(
        mockImageFile.buffer,
        mockImageFile.originalname,
      );
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should complete task without image when no file is provided', async () => {
      // Arrange
      const taskId = 1;
      const userId = 2;

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

      const completeDto: CompleteTaskDto = {
        latitude: 16.05444,
        longitude: 108.2022,
        notes: 'Task completed without image',
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completed_at: new Date(),
        evidence_image_url: null,
      });

      // Act
      const result = await service.completeTask(taskId, userId, completeDto, undefined);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.evidence_image_url).toBeNull();
      expect(mockCloudStorageService.uploadImage).not.toHaveBeenCalled();
      expect(mockTaskRepository.save).toHaveBeenCalled();
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
      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({ where: { id: taskId } });
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

  describe('getTasksForExport', () => {
    it('should return all tasks with tree and user relations when no filter provided', async () => {
      // Arrange
      const mockTasks = [
        {
          id: 1,
          task_type: TaskType.PRUNING,
          status: TaskStatus.PENDING,
          tree: { id: 1, tree_code: 'TREE001', species: { species_name: 'Bàng' } },
          assignedUser: { id: 2, full_name: 'Nguyễn Văn A', username: 'nguyenvana' },
        },
        {
          id: 2,
          task_type: TaskType.WATERING,
          status: TaskStatus.COMPLETED,
          tree: { id: 2, tree_code: 'TREE002', species: { species_name: 'Phượng' } },
          assignedUser: { id: 3, full_name: 'Trần Thị B', username: 'tranthib' },
        },
      ];

      mockTaskRepository.find.mockResolvedValue(mockTasks);

      // Act
      const result = await service.getTasksForExport();

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(mockTaskRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['tree', 'tree.species', 'assignedUser'],
          order: { scheduled_date: 'ASC' },
        }),
      );
    });

    it('should filter tasks by date range when both from and to are provided', async () => {
      // Arrange
      const from = '2026-01-01';
      const to = '2026-05-01';
      const mockTasks = [
        { id: 1, task_type: TaskType.PRUNING, scheduled_date: new Date('2026-03-15') },
      ];

      mockTaskRepository.find.mockResolvedValue(mockTasks);

      // Act
      const result = await service.getTasksForExport(from, to);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      const callArg = mockTaskRepository.find.mock.calls[0][0];
      expect(callArg.where.scheduled_date).toBeDefined();
      // Between operator được dùng khi có cả from và to
      expect(callArg.where.scheduled_date.type).toBe('between');
    });

    it('should filter tasks from a start date when only from is provided', async () => {
      // Arrange
      const from = '2026-03-01';
      mockTaskRepository.find.mockResolvedValue([]);

      // Act
      await service.getTasksForExport(from, undefined);

      // Assert
      const callArg = mockTaskRepository.find.mock.calls[0][0];
      expect(callArg.where.scheduled_date).toBeDefined();
      // MoreThanOrEqual operator
      expect(callArg.where.scheduled_date.type).toBe('moreThanOrEqual');
    });

    it('should filter tasks up to an end date when only to is provided', async () => {
      // Arrange
      const to = '2026-06-30';
      mockTaskRepository.find.mockResolvedValue([]);

      // Act
      await service.getTasksForExport(undefined, to);

      // Assert
      const callArg = mockTaskRepository.find.mock.calls[0][0];
      expect(callArg.where.scheduled_date).toBeDefined();
      // LessThanOrEqual operator
      expect(callArg.where.scheduled_date.type).toBe('lessThanOrEqual');
    });

    it('should return empty array when no tasks match the filter', async () => {
      // Arrange
      mockTaskRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getTasksForExport('2099-01-01', '2099-12-31');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
