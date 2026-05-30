import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { HealthStatus, Tree } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';

export interface ExcelRow {
  tree_code: string;
  species: string;
  area_name: string;
  latitude: number;
  longitude: number;
  height_m?: number;
  trunk_diameter_cm?: number;
  health_status?: string;
  planting_year?: number;
}

export interface ValidationError {
  row: number;
  message: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: ValidationError[];
}

export interface ImportPreviewResult {
  total: number;
  rows: ExcelRow[];
  errors: ValidationError[];
}

const EXCEL_HEADERS: (keyof ExcelRow)[] = [
  'tree_code',
  'species',
  'area_name',
  'latitude',
  'longitude',
  'height_m',
  'trunk_diameter_cm',
  'health_status',
  'planting_year',
];

const HEALTH_STATUSES = Object.values(HealthStatus) as string[];
const TEMPLATE_ROWS: ExcelRow[] = [
  {
    tree_code: 'LC-HKB-001',
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
    tree_code: 'LC-HH-002',
    species: 'Bang lang',
    area_name: 'Hoa Hiep Nam',
    latitude: 16.1174,
    longitude: 108.1279,
    height_m: 4.8,
    trunk_diameter_cm: 21,
    health_status: HealthStatus.WEAK,
    planting_year: 2020,
  },
  {
    tree_code: 'LC-XT-003',
    species: 'Phuong vi',
    area_name: 'Xuan Thieu',
    latitude: 16.0957,
    longitude: 108.1191,
    height_m: 6.1,
    trunk_diameter_cm: 29,
    health_status: HealthStatus.GOOD,
    planting_year: 2019,
  },
];

function toText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text);
    if ('result' in value) return String(value.result ?? '');
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
  }
  return String(value).trim();
}

function toNumber(value: ExcelJS.CellValue): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(toText(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isInRange(value: number | undefined, min: number, max: number): boolean {
  return value !== undefined && value >= min && value <= max;
}

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Tree)
    private readonly treeRepository: Repository<Tree>,
    @InjectRepository(TreeSpecies)
    private readonly speciesRepository: Repository<TreeSpecies>,
    @InjectRepository(AdministrativeArea)
    private readonly areaRepository: Repository<AdministrativeArea>,
  ) {}

  async parseExcel(buffer: Buffer): Promise<ExcelRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const rows: ExcelRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const parsedRow = EXCEL_HEADERS.reduce((acc, header, index) => {
        const cellValue = row.getCell(index + 1).value;
        const value = ['latitude', 'longitude', 'height_m', 'trunk_diameter_cm', 'planting_year'].includes(header)
          ? toNumber(cellValue)
          : toText(cellValue);
        return { ...acc, [header]: value };
      }, {} as ExcelRow);

      const hasValues = EXCEL_HEADERS.some((header) => parsedRow[header] !== '' && parsedRow[header] !== undefined);
      if (hasValues) {
        rows.push(parsedRow);
      }
    });

    return rows;
  }

  validateRow(row: ExcelRow, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const rowNumber = index;

    if (!row.tree_code?.trim()) errors.push({ row: rowNumber, message: 'tree_code is required' });
    if (!row.species?.trim()) errors.push({ row: rowNumber, message: 'species is required' });
    if (!row.area_name?.trim()) errors.push({ row: rowNumber, message: 'area_name is required' });
    if (!isInRange(row.latitude, -90, 90)) {
      errors.push({ row: rowNumber, message: 'latitude must be between -90 and 90' });
    }
    if (!isInRange(row.longitude, -180, 180)) {
      errors.push({ row: rowNumber, message: 'longitude must be between -180 and 180' });
    }
    if (row.height_m !== undefined && row.height_m < 0) {
      errors.push({ row: rowNumber, message: 'height_m must be greater than or equal to 0' });
    }
    if (row.trunk_diameter_cm !== undefined && row.trunk_diameter_cm < 0) {
      errors.push({ row: rowNumber, message: 'trunk_diameter_cm must be greater than or equal to 0' });
    }
    if (row.health_status && !HEALTH_STATUSES.includes(row.health_status)) {
      errors.push({ row: rowNumber, message: 'health_status is invalid' });
    }
    if (row.planting_year !== undefined && !isInRange(row.planting_year, 1900, 2100)) {
      errors.push({ row: rowNumber, message: 'planting_year must be between 1900 and 2100' });
    }

    return errors;
  }

  async previewRows(rows: ExcelRow[]): Promise<ImportPreviewResult> {
    const errors = rows.flatMap((row, index) => this.validateRow(row, index + 2));
    return {
      total: rows.length,
      rows: rows.slice(0, 5),
      errors,
    };
  }

  async importTrees(rows: ExcelRow[]): Promise<ImportResult> {
    const result: ImportResult = {
      total: rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const validationErrors = this.validateRow(row, rowNumber);
      if (validationErrors.length > 0) {
        result.errors = [...result.errors, ...validationErrors];
        continue;
      }

      const existingTree = await this.treeRepository.findOne({ where: { tree_code: row.tree_code } });
      if (existingTree) {
        result.skipped += 1;
        continue;
      }

      const [species, area] = await Promise.all([
        this.speciesRepository.findOne({ where: { common_name: row.species } }),
        this.areaRepository.findOne({ where: { area_name: row.area_name } }),
      ]);

      const referenceErrors: ValidationError[] = [];
      if (!species) {
        referenceErrors.push({ row: rowNumber, message: `species "${row.species}" was not found` });
      }
      if (!area) {
        referenceErrors.push({ row: rowNumber, message: `area_name "${row.area_name}" was not found` });
      }
      if (referenceErrors.length > 0) {
        result.errors = [...result.errors, ...referenceErrors];
        continue;
      }

      if (!species || !area) continue;

      const tree = this.treeRepository.create({
        tree_code: row.tree_code,
        species_id: species.id,
        area_id: area.id,
        location: {
          type: 'Point' as const,
          coordinates: [row.longitude, row.latitude],
        },
        planting_year: row.planting_year,
        height_m: row.height_m,
        trunk_diameter_cm: row.trunk_diameter_cm,
        health_status: (row.health_status as HealthStatus | undefined) ?? HealthStatus.GOOD,
      });

      await this.treeRepository.save(tree);
      result.imported += 1;
    }

    return result;
  }

  async createTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Urban Green Infrastructure System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Trees Import');
    sheet.columns = EXCEL_HEADERS.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 4, 18),
    }));
    sheet.addRows(TEMPLATE_ROWS);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF166534' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
