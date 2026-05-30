import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { HealthStatus, Tree } from '../../entities/tree.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';

export interface HealthStats {
  healthy: number;
  weak: number;
  dead: number;
}

@Injectable()
export class StatsService {
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
    const groups = [
      { label: '0-5 năm', min: 0, max: 5, count: 0 },
      { label: '6-10 năm', min: 6, max: 10, count: 0 },
      { label: '11-20 năm', min: 11, max: 20, count: 0 },
      { label: '>20 năm', min: 21, max: Number.POSITIVE_INFINITY, count: 0 },
    ];

    for (const tree of trees) {
      if (!tree.planting_year) continue;
      const age = Math.max(0, currentYear - tree.planting_year);
      const group = groups.find((item) => age >= item.min && age <= item.max);
      if (group) group.count += 1;
    }

    return groups.map(({ label, count }) => ({ label, count }));
  }

  async getAreas() {
    return this.areaRepository.find({ order: { area_name: 'ASC' } });
  }

  async exportAgeStatsCsv(res: Response, areaId?: number) {
    const rows = await this.getAgeStats(areaId);
    const csv = [
      'Nhóm tuổi,Số cây',
      ...rows.map((row) => `${row.label},${row.count}`),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tree-age-stats.csv"');
    res.send(`\uFEFF${csv}`);
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
