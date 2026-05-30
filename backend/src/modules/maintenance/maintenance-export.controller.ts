import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MaintenanceExportService, ExportFilter } from './maintenance-export.service';

export interface ExportQueryDto {
  format?: string;
  from?: string;
  to?: string;
}

const SUPPORTED_FORMATS = ['xlsx', 'pdf'] as const;
type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

function isSupportedFormat(value: string): value is SupportedFormat {
  return (SUPPORTED_FORMATS as readonly string[]).includes(value);
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceExportController {
  constructor(private readonly maintenanceExportService: MaintenanceExportService) {}

  @Get('tasks/export')
  async exportTasks(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { format, from, to } = query;

    // Validate format param
    if (!format || !isSupportedFormat(format)) {
      throw new BadRequestException(
        `Tham số "format" bắt buộc và phải là một trong: ${SUPPORTED_FORMATS.join(', ')}`,
      );
    }

    const filter: ExportFilter = { from, to };

    if (format === 'xlsx') {
      const buffer = await this.maintenanceExportService.exportToXlsx(filter);
      const filename = `maintenance-report-${Date.now()}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.end(buffer);
      return;
    }

    // format === 'pdf'
    const buffer = await this.maintenanceExportService.exportToPdf(filter);
    const filename = `maintenance-report-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
  }
}
