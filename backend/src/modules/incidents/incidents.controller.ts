import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { IncidentsService } from './incidents.service';

@ApiTags('incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @ApiOperation({ summary: 'Report an urgent tree incident' })
  @ApiResponse({ status: 201, description: 'Incident created.' })
  async create(@Body() dto: CreateIncidentDto, @Request() req) {
    const userId = req.user?.userId ?? req.user?.id;
    return this.incidentsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get incidents newest first' })
  async findAll() {
    return this.incidentsService.findAll();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update incident status' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateIncidentStatusDto) {
    return this.incidentsService.updateStatus(+id, dto);
  }
}
