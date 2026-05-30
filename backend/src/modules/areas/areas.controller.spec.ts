import { Test, TestingModule } from '@nestjs/testing';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('AreasController', () => {
  let controller: AreasController;
  let service: AreasService;

  const mockAreasService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AreasController],
      providers: [
        {
          provide: AreasService,
          useValue: mockAreasService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AreasController>(AreasController);
    service = module.get<AreasService>(AreasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new area', async () => {
      const createDto: CreateAreaDto = {
        name: 'Quận Liên Chiểu',
      };

      const mockResult = {
        id: 1,
        area_name: 'Quận Liên Chiểu',
        parent_id: null,
      };

      mockAreasService.create.mockResolvedValue(mockResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockResult);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update an area', async () => {
      const updateDto: UpdateAreaDto = {
        name: 'Quận Liên Chiểu Updated',
      };

      const mockResult = {
        id: 1,
        area_name: 'Quận Liên Chiểu Updated',
        parent_id: null,
      };

      mockAreasService.update.mockResolvedValue(mockResult);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(mockResult);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('delete', () => {
    it('should delete an area', async () => {
      const mockResult = { message: 'Area deleted successfully' };

      mockAreasService.delete.mockResolvedValue(mockResult);

      const result = await controller.delete('1');

      expect(result).toEqual(mockResult);
      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });
});
