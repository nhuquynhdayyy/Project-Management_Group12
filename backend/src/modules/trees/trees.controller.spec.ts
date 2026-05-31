import { Test, TestingModule } from '@nestjs/testing';
import { TreesController } from './trees.controller';
import { TreesService } from './trees.service';
import { ImportService } from './import.service';
import { CreateTreeDto } from './dto/create-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { HealthStatus } from '../../entities/tree.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

describe('TreesController', () => {
  let controller: TreesController;

  const mockTreesService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findTreesWithinRadius: jest.fn(),
    syncOfflineActions: jest.fn(),
  };

  const mockImportService = {
    createTemplate: jest.fn(),
    parseExcel: jest.fn(),
    previewRows: jest.fn(),
    importTrees: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  // Minimal mock request with JWT user payload
  const mockReq = {
    user: { userId: 1, id: 1, username: 'admin', roles: ['admin'] },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TreesController],
      providers: [
        {
          provide: TreesService,
          useValue: mockTreesService,
        },
        {
          provide: ImportService,
          useValue: mockImportService,
        },
        // JwtAuthGuard injects JwtService — provide a mock so NestJS DI doesn't fail
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<TreesController>(TreesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new tree', async () => {
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

      const mockTree = {
        id: 1,
        ...createTreeDto,
        location: 'POINT(105.8542 21.0285)',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTreesService.create.mockResolvedValue(mockTree);

      // Act
      const result = await controller.create(createTreeDto, mockReq);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockTreesService.create).toHaveBeenCalledWith(createTreeDto, 1);
    });
  });

  describe('findAll', () => {
    it('should return an array of trees', async () => {
      // Arrange
      const mockTrees = [
        { id: 1, tree_code: 'TREE001' },
        { id: 2, tree_code: 'TREE002' },
      ];

      mockTreesService.findAll.mockResolvedValue(mockTrees);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(mockTreesService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single tree by id', async () => {
      // Arrange
      const mockTree = {
        id: 1,
        tree_code: 'TREE001',
        species_id: 1,
        area_id: 1,
      };

      mockTreesService.findById.mockResolvedValue(mockTree);

      // Act
      const result = await controller.findOne('1');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockTreesService.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('findNearby', () => {
    it('should return trees within specified radius', async () => {
      // Arrange
      const findNearbyDto: FindTreesNearbyDto = {
        latitude: 21.0285,
        longitude: 105.8542,
        radius_meters: 100,
      };

      const mockNearbyTrees = [
        { id: 1, tree_code: 'TREE001', distance: 50 },
        { id: 2, tree_code: 'TREE002', distance: 80 },
      ];

      mockTreesService.findTreesWithinRadius.mockResolvedValue(mockNearbyTrees);

      // Act
      const result = await controller.findNearby(findNearbyDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(mockTreesService.findTreesWithinRadius).toHaveBeenCalledWith(
        findNearbyDto,
      );
    });
  });

  describe('update', () => {
    it('should update a tree with the current user id', async () => {
      const mockTree = { id: 1, tree_code: 'TREE001', height_m: 8 };
      mockTreesService.update.mockResolvedValue(mockTree);

      const result = await controller.update('1', { height_m: 8 }, mockReq);

      expect(result).toBe(mockTree);
      expect(mockTreesService.update).toHaveBeenCalledWith(
        1,
        { height_m: 8 },
        1,
      );
    });
  });

  describe('delete', () => {
    it('should delete a tree with the current user id', async () => {
      mockTreesService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('1', mockReq);

      expect(result).toEqual({ success: true });
      expect(mockTreesService.delete).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('importTrees', () => {
    it('should parse and import xlsx file', async () => {
      // Arrange
      const file = {
        originalname: 'trees.xlsx',
        buffer: Buffer.from('fake-xlsx'),
      } as Express.Multer.File;
      const rows = [{ tree_code: 'LC-001' }];
      const importResult = { total: 1, imported: 1, skipped: 0, errors: [] };

      mockImportService.parseExcel.mockResolvedValue(rows);
      mockImportService.importTrees.mockResolvedValue(importResult);

      // Act
      const result = await controller.importTrees(file);

      // Assert
      expect(result).toEqual(importResult);
      expect(mockImportService.parseExcel).toHaveBeenCalledWith(file.buffer);
      expect(mockImportService.importTrees).toHaveBeenCalledWith(rows);
    });

    it('should reject non-xlsx files', async () => {
      // Arrange
      const file = {
        originalname: 'trees.csv',
        buffer: Buffer.from('csv'),
      } as Express.Multer.File;

      // Act & Assert
      await expect(controller.importTrees(file)).rejects.toThrow('Only .xlsx files are supported');
    });
  });

  describe('syncOfflineActions', () => {
    it('should pass offline actions to the service', async () => {
      const actions = [
        {
          id: 'offline-1',
          type: 'health_update',
          treeId: 1,
          data: { health_status: HealthStatus.WEAK },
          offlineTimestamp: '2026-01-02T00:00:00.000Z',
        },
      ];
      const syncResult = { synced: [{ id: 'offline-1' }], skipped: [], errors: [] };
      mockTreesService.syncOfflineActions.mockResolvedValue(syncResult);

      const result = await controller.syncOfflineActions(actions, { user: { userId: 7 } });

      expect(result).toEqual(syncResult);
      expect(mockTreesService.syncOfflineActions).toHaveBeenCalledWith(actions, 7);
    });
  });
});
