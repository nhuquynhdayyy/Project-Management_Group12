import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreesService } from './trees.service';
import { Tree, HealthStatus } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { TreePhysicalLog } from '../../entities/tree-physical-log.entity';
import { MaintenanceTask } from '../../entities/maintenance-task.entity';
import { CreateTreeDto } from './dto/create-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { UpdatePhysicalDto } from './dto/update-physical.dto';
import { PhysicalHistoryQueryDto } from './dto/physical-history-query.dto';

describe('TreesService', () => {
  let service: TreesService;
  let treeRepository: Repository<Tree>;
  let speciesRepository: Repository<TreeSpecies>;
  let areaRepository: Repository<AdministrativeArea>;
  let physicalLogRepository: Repository<TreePhysicalLog>;
  let taskRepository: Repository<MaintenanceTask>;

  const mockTreeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSpeciesRepository = {
    findOne: jest.fn(),
  };

  const mockAreaRepository = {
    findOne: jest.fn(),
  };

  const mockPhysicalLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockTaskRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreesService,
        {
          provide: getRepositoryToken(Tree),
          useValue: mockTreeRepository,
        },
        {
          provide: getRepositoryToken(TreeSpecies),
          useValue: mockSpeciesRepository,
        },
        {
          provide: getRepositoryToken(AdministrativeArea),
          useValue: mockAreaRepository,
        },
        {
          provide: getRepositoryToken(TreePhysicalLog),
          useValue: mockPhysicalLogRepository,
        },
        {
          provide: getRepositoryToken(MaintenanceTask),
          useValue: mockTaskRepository,
        },
      ],
    }).compile();

    service = module.get<TreesService>(TreesService);
    treeRepository = module.get<Repository<Tree>>(getRepositoryToken(Tree));
    speciesRepository = module.get<Repository<TreeSpecies>>(getRepositoryToken(TreeSpecies));
    areaRepository = module.get<Repository<AdministrativeArea>>(getRepositoryToken(AdministrativeArea));
    physicalLogRepository = module.get<Repository<TreePhysicalLog>>(getRepositoryToken(TreePhysicalLog));
    taskRepository = module.get<Repository<MaintenanceTask>>(getRepositoryToken(MaintenanceTask));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
it('should create a tree with valid data', async () => {
      // Arrange
      const createTreeDto: CreateTreeDto = {
        tree_code: 'TREE001',
        species_id: 1,
        area_id: 1,
        latitude: 21.0285,
        longitude: 105.8542,
        planting_year: 2020,
        height_m: 5.5,
        trunk_diameter_cm: 30.0,
        health_status: HealthStatus.GOOD,
      };

      const mockSpecies = {
        id: 1,
        common_name: 'Cây Xanh',
        scientific_name: 'Plantus Viridis',
      };

      const mockArea = {
        id: 1,
        area_name: 'Quận 1',
      };

      const mockTree = {
        id: 1,
        ...createTreeDto,
        location: {
          type: 'Point' as const,
          coordinates: [createTreeDto.longitude, createTreeDto.latitude],
        },
        species: mockSpecies,
        area: mockArea,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSpeciesRepository.findOne.mockResolvedValue(mockSpecies);
      mockAreaRepository.findOne.mockResolvedValue(mockArea);
      mockTreeRepository.create.mockReturnValue(mockTree);
      mockTreeRepository.save.mockResolvedValue(mockTree);

      // Act
      const result = await service.create(createTreeDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.tree_code).toBe('TREE001');
      expect(mockSpeciesRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockAreaRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockTreeRepository.save).toHaveBeenCalled();
    });

    it('should fail if tree_code is missing', async () => {
      // Arrange
      const createTreeDto: any = {
        species_id: 1,
        area_id: 1,
        latitude: 21.0285,
        longitude: 105.8542,
      };

      // Act & Assert
      await expect(service.create(createTreeDto)).rejects.toThrow();
    });

    it('should fail if species does not exist', async () => {
      // Arrange
      const createTreeDto: CreateTreeDto = {
        tree_code: 'TREE002',
        species_id: 999,
        area_id: 1,
        latitude: 21.0285,
        longitude: 105.8542,
      };

      mockSpeciesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createTreeDto)).rejects.toThrow('Species not found');
    });

    it('should fail if area does not exist', async () => {
      // Arrange
      const createTreeDto: CreateTreeDto = {
        tree_code: 'TREE003',
        species_id: 1,
        area_id: 999,
        latitude: 21.0285,
        longitude: 105.8542,
      };

      const mockSpecies = { id: 1, common_name: 'Cây Xanh' };
      mockSpeciesRepository.findOne.mockResolvedValue(mockSpecies);
      mockAreaRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createTreeDto)).rejects.toThrow('Area not found');
    });
  });

  describe('findTreesWithinRadius', () => {
it('should find trees within radius', async () => {
      // Arrange
      const findNearbyDto: FindTreesNearbyDto = {
        latitude: 21.0285,
        longitude: 105.8542,
        radius_meters: 100,
      };

      const mockTrees = [
        {
          id: 1,
          tree_code: 'TREE001',
          location: 'POINT(105.8542 21.0285)',
          distance: 50,
        },
        {
          id: 2,
          tree_code: 'TREE002',
          location: 'POINT(105.8543 21.0286)',
          distance: 80,
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockTrees),
      };

      mockTreeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findTreesWithinRadius(findNearbyDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(mockTreeRepository.createQueryBuilder).toHaveBeenCalledWith('tree');
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();
    });

    it('should return empty array when no trees found within radius', async () => {
      // Arrange
      const findNearbyDto: FindTreesNearbyDto = {
        latitude: 21.0285,
        longitude: 105.8542,
        radius_meters: 10,
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockTreeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findTreesWithinRadius(findNearbyDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });

    it('should order results by distance', async () => {
      // Arrange
      const findNearbyDto: FindTreesNearbyDto = {
        latitude: 21.0285,
        longitude: 105.8542,
        radius_meters: 200,
      };

      const mockTrees = [
        { id: 1, tree_code: 'TREE001', distance: 50 },
        { id: 2, tree_code: 'TREE002', distance: 100 },
        { id: 3, tree_code: 'TREE003', distance: 150 },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockTrees),
      };

      mockTreeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
// Act
      const result = await service.findTreesWithinRadius(findNearbyDto);

      // Assert
      expect(result[0].distance).toBeLessThanOrEqual(result[1].distance);
      expect(result[1].distance).toBeLessThanOrEqual(result[2].distance);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('distance', 'ASC');
    });
  });

  describe('findById', () => {
    it('should find a tree by id', async () => {
      // Arrange
      const mockTree = {
        id: 1,
        tree_code: 'TREE001',
        species_id: 1,
        area_id: 1,
        location: 'POINT(105.8542 21.0285)',
      };

      mockTreeRepository.findOne.mockResolvedValue(mockTree);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockTreeRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return null when tree not found', async () => {
      // Arrange
      mockTreeRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all trees', async () => {
      // Arrange
      const mockTrees = [
        { id: 1, tree_code: 'TREE001' },
        { id: 2, tree_code: 'TREE002' },
      ];

      mockTreeRepository.find.mockResolvedValue(mockTrees);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(mockTreeRepository.find).toHaveBeenCalled();
    });
  });
  describe('updatePhysical', () => {
    it('should update physical measurements and create log', async () => {
      // Arrange
      const treeId = 1;
      const userId = 1;
      const updatePhysicalDto: UpdatePhysicalDto = {
        height_m: 6.5,
        trunk_diameter_cm: 35.0,
        canopy_diameter_m: 4.5,
        tilt_degree: 5,
        notes: 'Regular measurement',
      };

      const mockTree = {
        id: treeId,
        tree_code: 'TREE001',
        height_m: 5.5,
        trunk_diameter_cm: 30.0,
        canopy_diameter_m: 4.0,
        tilt_degree: 0,
      };

      const mockUpdatedTree = {
        ...mockTree,
        height_m: 6.5,
        trunk_diameter_cm: 35.0,
        canopy_diameter_m: 4.5,
        tilt_degree: 5,
      };

      const mockLog = {
        id: 1,
        tree_id: treeId,
        user_id: userId,
        height_m: 6.5,
        trunk_diameter_cm: 35.0,
        canopy_diameter_m: 4.5,
        tilt_degree: 5,
        old_values: {
          height_m: 5.5,
          trunk_diameter_cm: 30.0,
          canopy_diameter_m: 4.0,
          tilt_degree: 0,
        },
        new_values: {
          height_m: 6.5,
          trunk_diameter_cm: 35.0,
          canopy_diameter_m: 4.5,
          tilt_degree: 5,
        },
        notes: 'Regular measurement',
measured_at: new Date(),
      };

      mockTreeRepository.findOne.mockResolvedValue(mockTree);
      mockTreeRepository.save.mockResolvedValue(mockUpdatedTree);
      mockPhysicalLogRepository.create.mockReturnValue(mockLog);
      mockPhysicalLogRepository.save.mockResolvedValue(mockLog);

      // Act
      const result = await service.updatePhysical(treeId, userId, updatePhysicalDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.tree).toBeDefined();
      expect(result.log).toBeDefined();
      expect(result.tree.height_m).toBe(6.5);
      expect(result.log.old_values.height_m).toBe(5.5);
      expect(result.log.new_values.height_m).toBe(6.5);
      expect(mockTreeRepository.findOne).toHaveBeenCalledWith({ where: { id: treeId } });
      expect(mockTreeRepository.save).toHaveBeenCalled();
      expect(mockPhysicalLogRepository.save).toHaveBeenCalled();
    });

    it('should update only specified fields', async () => {
      // Arrange
      const treeId = 1;
      const userId = 1;
      const updatePhysicalDto: UpdatePhysicalDto = {
        height_m: 7.0,
        notes: 'Height only update',
      };

      const mockTree = {
        id: treeId,
        tree_code: 'TREE001',
        height_m: 6.5,
        trunk_diameter_cm: 35.0,
        canopy_diameter_m: 4.5,
        tilt_degree: 5,
      };

      const mockUpdatedTree = {
        ...mockTree,
        height_m: 7.0,
      };

      const mockLog = {
        id: 1,
        tree_id: treeId,
        user_id: userId,
        height_m: 7.0,
        old_values: {
          height_m: 6.5,
          trunk_diameter_cm: 35.0,
          canopy_diameter_m: 4.5,
          tilt_degree: 5,
        },
        new_values: {
          height_m: 7.0,
        },
        notes: 'Height only update',
        measured_at: new Date(),
      };

      mockTreeRepository.findOne.mockResolvedValue(mockTree);
      mockTreeRepository.save.mockResolvedValue(mockUpdatedTree);
      mockPhysicalLogRepository.create.mockReturnValue(mockLog);
      mockPhysicalLogRepository.save.mockResolvedValue(mockLog);

      // Act
      const result = await service.updatePhysical(treeId, userId, updatePhysicalDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.tree.height_m).toBe(7.0);
      expect(result.tree.trunk_diameter_cm).toBe(35.0); // unchanged
      expect(result.log.new_values.height_m).toBe(7.0);
      expect(result.log.new_values.trunk_diameter_cm).toBeUndefined();
    });

    it('should throw NotFoundException when tree not found', async () => {
      // Arrange
      const treeId = 999;
      const userId = 1;
      const updatePhysicalDto: UpdatePhysicalDto = {
        height_m: 6.5,
      };

      mockTreeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updatePhysical(treeId, userId, updatePhysicalDto)).rejects.toThrow(
        'Tree not found',
      );
    });
  });

  describe('getPhysicalHistory', () => {
it('should return paginated physical history', async () => {
      // Arrange
      const treeId = 1;
      const query: PhysicalHistoryQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockTree = {
        id: treeId,
        tree_code: 'TREE001',
      };

      const mockLogs = [
        {
          id: 2,
          tree_id: treeId,
          user_id: 1,
          height_m: 7.0,
          measured_at: new Date('2024-02-01'),
        },
        {
          id: 1,
          tree_id: treeId,
          user_id: 1,
          height_m: 6.5,
          measured_at: new Date('2024-01-01'),
        },
      ];

      mockTreeRepository.findOne.mockResolvedValue(mockTree);
      mockPhysicalLogRepository.findAndCount.mockResolvedValue([mockLogs, 2]);

      // Act
      const result = await service.getPhysicalHistory(treeId, query);

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockPhysicalLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { tree_id: treeId },
        order: { measured_at: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const treeId = 1;
      const query: PhysicalHistoryQueryDto = {
        page: 2,
        limit: 5,
      };

      const mockTree = {
        id: treeId,
        tree_code: 'TREE001',
      };

      const mockLogs = [
        {
          id: 5,
          tree_id: treeId,
          user_id: 1,
          height_m: 7.5,
          measured_at: new Date('2024-01-05'),
        },
      ];

      mockTreeRepository.findOne.mockResolvedValue(mockTree);
      mockPhysicalLogRepository.findAndCount.mockResolvedValue([mockLogs, 10]);

      // Act
      const result = await service.getPhysicalHistory(treeId, query);

      // Assert
      expect(result).toBeDefined();
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(mockPhysicalLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { tree_id: treeId },
        order: { measured_at: 'DESC' },
        skip: 5,
        take: 5,
      });
    });

    it('should use default pagination values', async () => {
      // Arrange
      const treeId = 1;
      const query: PhysicalHistoryQueryDto = {};

      const mockTree = {
        id: treeId,
        tree_code: 'TREE001',
      };

      mockTreeRepository.findOne.mockResolvedValue(mockTree);
      mockPhysicalLogRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      const result = await service.getPhysicalHistory(treeId, query);

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockPhysicalLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { tree_id: treeId },
        order: { measured_at: 'DESC' },
skip: 0,
        take: 10,
      });
    });

    it('should throw NotFoundException when tree not found', async () => {
      // Arrange
      const treeId = 999;
      const query: PhysicalHistoryQueryDto = {};

      mockTreeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPhysicalHistory(treeId, query)).rejects.toThrow('Tree not found');
    });
  });

  describe('syncOfflineActions', () => {
    it('should skip actions older than the current tree update', async () => {
      const currentUpdatedAt = new Date('2026-01-02T00:00:00.000Z');
      mockTreeRepository.findOne.mockResolvedValue({
        id: 1,
        updated_at: currentUpdatedAt,
      });

      const result = await service.syncOfflineActions(
        [
          {
            id: 'offline-1',
            type: 'health_update',
            treeId: 1,
            data: { health_status: HealthStatus.WEAK },
            offlineTimestamp: '2026-01-01T00:00:00.000Z',
          },
        ],
        1,
      );

      expect(result.synced).toHaveLength(0);
      expect(result.skipped).toEqual([
        { id: 'offline-1', type: 'health_update', treeId: 1, taskId: undefined },
      ]);
      expect(mockTreeRepository.save).not.toHaveBeenCalled();
    });

    it('should apply actions newer than the current tree update', async () => {
      const tree = {
        id: 1,
        health_status: HealthStatus.GOOD,
        updated_at: new Date('2026-01-01T00:00:00.000Z'),
      };
      mockTreeRepository.findOne.mockResolvedValue(tree);
      mockTreeRepository.save.mockResolvedValue({
        ...tree,
        health_status: HealthStatus.WEAK,
      });

      const result = await service.syncOfflineActions(
        [
          {
            id: 'offline-2',
            type: 'health_update',
            treeId: 1,
            data: { health_status: HealthStatus.WEAK },
            offlineTimestamp: '2026-01-02T00:00:00.000Z',
          },
        ],
        1,
      );

      expect(result.synced).toEqual([
        { id: 'offline-2', type: 'health_update', treeId: 1, taskId: undefined },
      ]);
      expect(mockTreeRepository.save).toHaveBeenCalledWith({
        ...tree,
        health_status: HealthStatus.WEAK,
      });
    });

    it('should apply multiple newer actions for the same tree in one sync batch', async () => {
      const tree = {
        id: 1,
        health_status: HealthStatus.GOOD,
        height_m: 5,
        trunk_diameter_cm: 20,
        canopy_diameter_m: 3,
        tilt_degree: 0,
        updated_at: new Date('2026-01-01T00:00:00.000Z'),
      };
      const physicalLog = {
        id: 1,
        tree_id: 1,
        user_id: 1,
        height_m: 6,
        old_values: {
          height_m: 5,
          trunk_diameter_cm: 20,
          canopy_diameter_m: 3,
          tilt_degree: 0,
        },
        new_values: { height_m: 6 },
      };

      mockTreeRepository.findOne
        .mockResolvedValueOnce(tree)
.mockResolvedValueOnce({ ...tree })
        .mockResolvedValueOnce({ ...tree, health_status: HealthStatus.WEAK });
      mockTreeRepository.save.mockImplementation(async (savedTree) => savedTree);
      mockPhysicalLogRepository.create.mockReturnValue(physicalLog);
      mockPhysicalLogRepository.save.mockResolvedValue(physicalLog);

      const result = await service.syncOfflineActions(
        [
          {
            id: 'offline-1',
            type: 'health_update',
            treeId: 1,
            data: { health_status: HealthStatus.WEAK },
            offlineTimestamp: '2026-01-02T00:00:00.000Z',
          },
          {
            id: 'offline-2',
            type: 'physical_update',
            treeId: 1,
            data: { height_m: 6 },
            offlineTimestamp: '2026-01-02T00:05:00.000Z',
          },
        ],
        1,
      );

      expect(result.synced).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(mockTreeRepository.save).toHaveBeenCalledTimes(2);
      expect(mockPhysicalLogRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
