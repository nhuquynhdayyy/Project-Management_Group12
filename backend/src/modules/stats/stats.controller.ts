import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatsService } from './stats.service';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get tree health percentages' })
  @ApiQuery({ name: 'areaId', required: false, type: Number })
  async health(@Query('areaId') areaId?: string) {
    return this.statsService.getHealthStats(areaId ? +areaId : undefined);
  }

  @Get('age')
  @ApiOperation({ summary: 'Get tree counts grouped by age range' })
  @ApiQuery({ name: 'areaId', required: false, type: Number })
  async age(@Query('areaId') areaId?: string) {
    return this.statsService.getAgeStats(areaId ? +areaId : undefined);
  }

  @Get('age/export')
  @ApiOperation({ summary: 'Export tree age statistics as an Excel workbook' })
  @ApiQuery({ name: 'areaId', required: false, type: Number })
  async exportAge(@Res() res: Response, @Query('areaId') areaId?: string) {
    return this.statsService.exportAgeStatsExcel(res, areaId ? +areaId : undefined);
  }

  @Get('areas')
  @ApiOperation({ summary: 'Get administrative areas for stats filters' })
  async areas() {
    return this.statsService.getAreas();
  }
}
