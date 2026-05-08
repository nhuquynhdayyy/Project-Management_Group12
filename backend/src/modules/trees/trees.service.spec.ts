import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreesService } from './trees.service';
import { Tree, HealthStatus } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { CreateTreeDto } from './dto/create-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditLog } from '../../entities/auditLog.entity';

describe('TreesService', () => {
  let service: TreesService;

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

  const mockAuditLogService = {
    log: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue([]),
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
        { provide: AuditLogService, useValue: mockAuditLogService },
        // Satisfy AuditLogService's @InjectRepository(AuditLog) metadata scan
        { provide: getRepositoryToken(AuditLog), useValue: {} },
      ],
    }).compile();

    service = module.get<TreesService>(TreesService);
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
      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
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
});
