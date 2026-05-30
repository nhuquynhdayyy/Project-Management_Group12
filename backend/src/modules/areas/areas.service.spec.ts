import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreasService } from './areas.service';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { Tree } from '../../entities/tree.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateAreaDto, AreaType } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

describe('AreasService', () => {
  let service: AreasService;
  let areaRepository: Repository<AdministrativeArea>;
  let treeRepository: Repository<Tree>;

  const mockAreaRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
  };

  const mockTreeRepository = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreasService,
        {
          provide: getRepositoryToken(AdministrativeArea),
          useValue: mockAreaRepository,
        },
        {
          provide: getRepositoryToken(Tree),
          useValue: mockTreeRepository,
        },
      ],
    }).compile();

    service = module.get<AreasService>(AreasService);
    areaRepository = module.get<Repository<AdministrativeArea>>(
      getRepositoryToken(AdministrativeArea),
    );
    treeRepository = module.get<Repository<Tree>>(getRepositoryToken(Tree));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new area successfully', async () => {
      const createDto: CreateAreaDto = {
        name: 'Quận Liên Chiểu',
        type: AreaType.DISTRICT,
      };

      const mockArea = {
        id: 1,
        area_name: 'Quận Liên Chiểu',
        parent_id: null,
      };

      mockAreaRepository.findOne.mockResolvedValue(null);
      mockAreaRepository.create.mockReturnValue(mockArea);
      mockAreaRepository.save.mockResolvedValue(mockArea);

      const result = await service.create(createDto);

      expect(result).toEqual(mockArea);
      expect(mockAreaRepository.findOne).toHaveBeenCalledWith({
        where: { area_name: createDto.name },
      });
      expect(mockAreaRepository.create).toHaveBeenCalledWith({
        area_name: createDto.name,
        parent_id: null,
      });
    });

    it('should throw BadRequestException if area name already exists', async () => {
      const createDto: CreateAreaDto = {
        name: 'Quận Liên Chiểu',
        type: AreaType.DISTRICT,
      };

      mockAreaRepository.findOne.mockResolvedValue({ id: 1, area_name: 'Quận Liên Chiểu' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('Area name already exists');
    });

    it('should throw NotFoundException if parent area not found', async () => {
      const createDto: CreateAreaDto = {
        name: 'Phường Hòa Khánh Bắc',
        type: AreaType.WARD,
        parentId: 999,
      };

      mockAreaRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Parent area not found');
    });

    it('should create area with parent successfully', async () => {
      const createDto: CreateAreaDto = {
        name: 'Phường Hòa Khánh Bắc',
        type: AreaType.WARD,
        parentId: 1,
      };

      const mockParent = { id: 1, area_name: 'Quận Liên Chiểu' };
      const mockArea = {
        id: 2,
        area_name: 'Phường Hòa Khánh Bắc',
        parent_id: 1,
      };

      mockAreaRepository.findOne
        .mockResolvedValueOnce(mockParent)
        .mockResolvedValueOnce(null);
      mockAreaRepository.create.mockReturnValue(mockArea);
      mockAreaRepository.save.mockResolvedValue(mockArea);

      const result = await service.create(createDto);

      expect(result).toEqual(mockArea);
      expect(mockAreaRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.parentId },
      });
    });
  });

  describe('update', () => {
    it('should update area name successfully', async () => {
      const updateDto: UpdateAreaDto = {
        name: 'Quận Liên Chiểu Updated',
      };

      const mockArea = {
        id: 1,
        area_name: 'Quận Liên Chiểu',
        parent_id: null,
      };

      const updatedArea = {
        ...mockArea,
        area_name: updateDto.name,
      };

      mockAreaRepository.findOne
        .mockResolvedValueOnce(mockArea)
        .mockResolvedValueOnce(null);
      mockAreaRepository.save.mockResolvedValue(updatedArea);

      const result = await service.update(1, updateDto);

      expect(result.area_name).toBe(updateDto.name);
      expect(mockAreaRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if area not found', async () => {
      const updateDto: UpdateAreaDto = {
        name: 'New Name',
      };

      mockAreaRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(999, updateDto)).rejects.toThrow('Area not found');
    });

    it('should throw BadRequestException if new name already exists', async () => {
      const updateDto: UpdateAreaDto = {
        name: 'Existing Name',
      };

      const mockArea = { id: 1, area_name: 'Old Name' };
      const existingArea = { id: 2, area_name: 'Existing Name' };

      mockAreaRepository.findOne
        .mockResolvedValueOnce(mockArea)
        .mockResolvedValueOnce(existingArea);

      await expect(service.update(1, updateDto)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateDto)).rejects.toThrow('Area name already exists');
    });
  });

  describe('delete', () => {
    it('should delete area successfully', async () => {
      const mockArea = {
        id: 1,
        area_name: 'Quận Liên Chiểu',
        parent_id: null,
      };

      mockAreaRepository.findOne.mockResolvedValue(mockArea);
      mockTreeRepository.count.mockResolvedValue(0);
      mockAreaRepository.count.mockResolvedValue(0);
      mockAreaRepository.remove.mockResolvedValue(mockArea);

      const result = await service.delete(1);

      expect(result).toEqual({ message: 'Area deleted successfully' });
      expect(mockAreaRepository.remove).toHaveBeenCalledWith(mockArea);
    });

    it('should throw NotFoundException if area not found', async () => {
      mockAreaRepository.findOne.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      await expect(service.delete(999)).rejects.toThrow('Area not found');
    });

    it('should throw BadRequestException if area has trees', async () => {
      const mockArea = { id: 1, area_name: 'Quận Liên Chiểu' };

      mockAreaRepository.findOne.mockResolvedValue(mockArea);
      mockTreeRepository.count.mockResolvedValue(5);

      await expect(service.delete(1)).rejects.toThrow(BadRequestException);
      await expect(service.delete(1)).rejects.toThrow(
        'Cannot delete area with 5 tree(s). Please reassign or remove trees first.',
      );
    });

    it('should throw BadRequestException if area has children', async () => {
      const mockArea = { id: 1, area_name: 'Quận Liên Chiểu' };

      mockAreaRepository.findOne.mockResolvedValue(mockArea);
      mockTreeRepository.count.mockResolvedValue(0);
      mockAreaRepository.count.mockResolvedValue(3);

      await expect(service.delete(1)).rejects.toThrow(BadRequestException);
      await expect(service.delete(1)).rejects.toThrow(
        'Cannot delete area with 3 child area(s). Please remove child areas first.',
      );
    });
  });
});
