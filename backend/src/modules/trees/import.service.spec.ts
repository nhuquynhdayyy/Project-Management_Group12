import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { ImportService } from './import.service';
import { Tree, HealthStatus } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';

describe('ImportService', () => {
  let service: ImportService;

  const mockTreeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSpeciesRepository = {
    findOne: jest.fn(),
  };

  const mockAreaRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
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
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseExcel', () => {
    it('should parse rows from the expected Excel headers', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Trees');
      sheet.addRow([
        'Mã cây',
        'Loài cây',
        'Khu vực',
        'Vĩ độ',
        'Kinh độ',
        'Chiều cao (m)',
        'Đường kính thân (cm)',
        'Tình trạng',
        'Năm trồng',
      ]);
      sheet.addRow(['LC-001', 'Sao den', 'Hoa Khanh Bac', 16.0732, 108.1498, 5.2, 24, HealthStatus.GOOD, 2021]);

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

      const result = await service.parseExcel(buffer);

      expect(result).toEqual([
        {
          tree_code: 'LC-001',
          species: 'Sao den',
          area_name: 'Hoa Khanh Bac',
          latitude: 16.0732,
          longitude: 108.1498,
          height_m: 5.2,
          trunk_diameter_cm: 24,
          health_status: HealthStatus.GOOD,
          planting_year: 2021,
        },
      ]);
    });
  });

  describe('validateRow', () => {
    it('should report missing and invalid values with row number', () => {
      const errors = service.validateRow(
        {
          tree_code: '',
          species: '',
          area_name: 'Hoa Khanh Bac',
          latitude: 99,
          longitude: 108.1498,
          height_m: -1,
          trunk_diameter_cm: 24,
          health_status: 'Unknown',
          planting_year: 1800,
        },
        2,
      );

      expect(errors).toEqual(
        expect.arrayContaining([
{ row: 2, message: 'tree_code is required' },
          { row: 2, message: 'species is required' },
          { row: 2, message: 'latitude must be between -90 and 90' },
          { row: 2, message: 'height_m must be greater than or equal to 0' },
          { row: 2, message: 'health_status is invalid' },
          { row: 2, message: 'planting_year must be between 1900 and 2100' },
        ]),
      );
    });
  });

  describe('importTrees', () => {
    it('should import valid rows and skip duplicate tree_code', async () => {
      const species = { id: 1, common_name: 'Sao den' };
      const area = { id: 2, area_name: 'Hoa Khanh Bac' };
      const createdTree = { id: 10, tree_code: 'LC-001' };

      mockTreeRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 99 });
      mockSpeciesRepository.findOne.mockResolvedValue(species);
      mockAreaRepository.findOne.mockResolvedValue(area);
      mockTreeRepository.create.mockReturnValue(createdTree);
      mockTreeRepository.save.mockResolvedValue(createdTree);

      const result = await service.importTrees([
        {
          tree_code: 'LC-001',
          species: 'Sao den',
          area_name: 'Hoa Khanh Bac',
          latitude: 16.0732,
          longitude: 108.1498,
          height_m: 5.2,
          trunk_diameter_cm: 24,
          health_status: HealthStatus.GOOD,
          planting_year: 2021,
        },
        {
          tree_code: 'LC-002',
          species: 'Sao den',
          area_name: 'Hoa Khanh Bac',
          latitude: 16.0732,
          longitude: 108.1498,
          height_m: 5.2,
          trunk_diameter_cm: 24,
          health_status: HealthStatus.GOOD,
          planting_year: 2021,
        },
      ]);

      expect(result).toEqual({
        total: 2,
        imported: 1,
        skipped: 1,
        errors: [],
      });
      expect(mockTreeRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return errors for missing species or area without saving', async () => {
      mockTreeRepository.findOne.mockResolvedValue(null);
      mockSpeciesRepository.findOne.mockResolvedValue(null);
      mockAreaRepository.findOne.mockResolvedValue(null);

      const result = await service.importTrees([
        {
          tree_code: 'LC-003',
          species: 'Missing',
          area_name: 'Missing Area',
          latitude: 16.0732,
          longitude: 108.1498,
          height_m: 5.2,
          trunk_diameter_cm: 24,
          health_status: HealthStatus.GOOD,
          planting_year: 2021,
        },
      ]);

      expect(result.imported).toBe(0);
      expect(result.errors).toEqual([
        { row: 2, message: 'species "Missing" was not found' },
        { row: 2, message: 'area_name "Missing Area" was not found' },
      ]);
      expect(mockTreeRepository.save).not.toHaveBeenCalled();
    });

  });

  describe('createTemplate', () => {
    it('should generate an Excel template buffer', async () => {
const buffer = await service.createTemplate();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];

      expect(sheet.getRow(1).values).toEqual([
        undefined,
        'Mã cây',
        'Loài cây',
        'Khu vực',
        'Vĩ độ',
        'Kinh độ',
        'Chiều cao (m)',
        'Đường kính thân (cm)',
        'Tình trạng',
        'Năm trồng',
      ]);
      expect(sheet.rowCount).toBe(4);
    });
  });
});
