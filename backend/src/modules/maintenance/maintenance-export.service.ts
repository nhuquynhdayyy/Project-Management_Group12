import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { MaintenanceTask } from '../../entities/maintenance-task.entity';
import { ExportService } from './export.service';

export interface ExportFilter {
  from?: string;
  to?: string;
}

@Injectable()
export class MaintenanceExportService {
  constructor(
    @InjectRepository(MaintenanceTask)
    private readonly taskRepository: Repository<MaintenanceTask>,
    private readonly exportService: ExportService,
  ) {}

  async exportToXlsx(filter?: ExportFilter): Promise<Buffer> {
    const tasks = await this.fetchTasks(filter);
    return this.exportService.exportToExcel(tasks);
  }

  async exportToPdf(filter?: ExportFilter): Promise<Buffer> {
    const tasks = await this.fetchTasks(filter);
    return this.exportService.exportToPdf(tasks);
  }

  private async fetchTasks(filter?: ExportFilter): Promise<MaintenanceTask[]> {
    const where: Record<string, any> = {};

    if (filter?.from && filter?.to) {
      where.scheduled_date = Between(
        new Date(filter.from),
        new Date(filter.to),
      );
    } else if (filter?.from) {
      where.scheduled_date = MoreThanOrEqual(new Date(filter.from));
    } else if (filter?.to) {
      where.scheduled_date = LessThanOrEqual(new Date(filter.to));
    }

    return this.taskRepository.find({
      where,
      relations: ['tree', 'tree.species', 'assignedUser'],
      order: { scheduled_date: 'ASC' },
    });
  }
}
