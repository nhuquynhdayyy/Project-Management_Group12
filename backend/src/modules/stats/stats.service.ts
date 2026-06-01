import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { HealthStatus, Tree } from '../../entities/tree.entity';

export interface HealthStats {
  healthy: number;
  weak: number;
  dead: number;
}

@Injectable()
export class StatsService {
  private readonly ageGroups = [
    { label: '0-5 năm', min: 0, max: 5 },
    { label: '6-10 năm', min: 6, max: 10 },
    { label: '11-20 năm', min: 11, max: 20 },
    { label: 'Trên 20 năm', min: 21, max: Number.POSITIVE_INFINITY },
    { label: 'Chưa rõ năm trồng', min: null, max: null },
  ];

  constructor(
    @InjectRepository(Tree)
    private readonly treeRepository: Repository<Tree>,
    @InjectRepository(AdministrativeArea)
    private readonly areaRepository: Repository<AdministrativeArea>,
  ) {}

  async getHealthStats(areaId?: number): Promise<HealthStats> {
    const trees = await this.getTrees(areaId);
    const total = trees.length || 1;

    const healthy = trees.filter((tree) => tree.health_status === HealthStatus.GOOD).length;
    const weak = trees.filter((tree) => tree.health_status === HealthStatus.WEAK).length;
    const dead = trees.filter((tree) =>
      [HealthStatus.DEAD, HealthStatus.DISEASED].includes(tree.health_status),
    ).length;

    return {
      healthy: this.toPercent(healthy, total),
      weak: this.toPercent(weak, total),
      dead: this.toPercent(dead, total),
    };
  }

  async getAgeStats(areaId?: number) {
    const trees = await this.getTrees(areaId);
    const currentYear = new Date().getFullYear();
    const groups = this.ageGroups.map((group) => ({ ...group, count: 0 }));

    for (const tree of trees) {
      if (!tree.planting_year) {
        groups[groups.length - 1].count += 1;
        continue;
      }

      const age = Math.max(0, currentYear - tree.planting_year);
      const group = groups.find(
        (item) => item.min !== null && item.max !== null && age >= item.min && age <= item.max,
      );
      if (group) group.count += 1;
    }

    return groups.map(({ label, count }) => ({ label, count }));
  }

  async getAreas() {
    return this.areaRepository.find({ order: { area_name: 'ASC' } });
  }

  async exportAgeStatsExcel(res: Response, areaId?: number) {
    const rows = await this.getAgeStats(areaId);
    const area = areaId ? await this.areaRepository.findOne({ where: { id: areaId } }) : null;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Thong ke do tuoi');

    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'Thống kê cây theo độ tuổi';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A2').value = 'Khu vực';
    worksheet.getCell('B2').value = area?.area_name ?? 'Tất cả khu vực';
    worksheet.getCell('A3').value = 'Ngày xuất';
    worksheet.getCell('B3').value = new Date().toLocaleString('vi-VN');

    worksheet.getRow(4).values = ['Nhóm tuổi', 'Số cây'];
    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9EAD3' },
    };
    worksheet.columns = [
      { key: 'label', width: 24 },
      { key: 'count', width: 14 },
    ];

    rows.forEach((row, index) => {
      worksheet.getRow(index + 5).values = [row.label, row.count];
    });
    worksheet.getColumn(2).numFmt = '0';

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="thong-ke-cay-theo-do-tuoi.xlsx"');
    res.send(Buffer.from(buffer));
  }

  private async getTrees(areaId?: number) {
    return this.treeRepository.find({
      where: areaId ? { area_id: areaId } : {},
    });
  }

  private toPercent(value: number, total: number) {
    return Math.round((value / total) * 100);
  }
}
