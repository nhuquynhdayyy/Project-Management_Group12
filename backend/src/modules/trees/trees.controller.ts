import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { TreesService } from './trees.service';
import { ImportService } from './import.service';
import { CreateTreeDto } from './dto/create-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { UpdatePhysicalDto } from './dto/update-physical.dto';
import { PhysicalHistoryQueryDto } from './dto/physical-history-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('trees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trees')
export class TreesController {
  constructor(
    private readonly treesService: TreesService,
    private readonly importService: ImportService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tree' })
  @ApiResponse({ status: 201, description: 'Tree successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(@Body() createTreeDto: CreateTreeDto) {
    return await this.treesService.create(createTreeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all trees' })
  @ApiResponse({ status: 200, description: 'List of all trees.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll() {
    return await this.treesService.findAll();
  }

  @Get('species')
  @ApiOperation({ summary: 'Get all tree species' })
  @ApiResponse({ status: 200, description: 'List of all tree species.' })
  async findAllSpecies() {
    return await this.treesService.findAllSpecies();
  }

  @Get('areas')
  @ApiOperation({ summary: 'Get all administrative areas' })
  @ApiResponse({ status: 200, description: 'List of all administrative areas.' })
  async findAllAreas() {
    return await this.treesService.findAllAreas();
  }

  @Get('import/template')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Download Excel template for tree import' })
  @ApiResponse({ status: 200, description: 'Excel template file.' })
  async downloadImportTemplate(@Res() res: Response): Promise<void> {
    const buffer = await this.importService.createTemplate();
    res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
    res.setHeader('Content-Disposition', 'attachment; filename="tree-import-template.xlsx"');
    res.end(buffer);
  }

  @Post('import/preview')
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview first rows from tree Excel import file' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async previewImport(@UploadedFile() file: Express.Multer.File) {
    this.assertXlsxFile(file);
    const rows = await this.importService.parseExcel(file.buffer);
    return await this.importService.previewRows(rows);
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import trees from Excel file' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Import result with imported, skipped and errors.' })
  async importTrees(@UploadedFile() file: Express.Multer.File) {
    this.assertXlsxFile(file);
    const rows = await this.importService.parseExcel(file.buffer);
    return await this.importService.importTrees(rows);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find trees within a radius (PostGIS)' })
  @ApiQuery({ name: 'latitude', required: true, type: Number, example: 16.0544 })
  @ApiQuery({ name: 'longitude', required: true, type: Number, example: 108.2022 })
  @ApiQuery({ name: 'radius_meters', required: false, type: Number, example: 1000, description: 'Search radius in metres (default: 1000)' })
  @ApiResponse({ status: 200, description: 'Trees within the given radius, ordered by distance.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findNearby(@Query() findNearbyDto: FindTreesNearbyDto) {
    return await this.treesService.findTreesWithinRadius(findNearbyDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tree by ID' })
  @ApiResponse({ status: 200, description: 'Tree found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findOne(@Param('id') id: string) {
    return await this.treesService.findById(+id);
  }

  @Patch(':id/health')
  @ApiOperation({ summary: 'Update tree health status' })
  @ApiResponse({ status: 200, description: 'Health status updated.' })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  async updateHealth(
    @Param('id') id: string,
    @Body('health_status') healthStatus: string,
  ) {
    return await this.treesService.updateHealthStatus(+id, healthStatus);
  }

  @Patch(':id/physical')
  @ApiOperation({ summary: 'Update tree physical measurements' })
  @ApiResponse({ status: 200, description: 'Physical measurements updated and logged.' })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  async updatePhysical(
    @Param('id') id: string,
    @Body() updatePhysicalDto: UpdatePhysicalDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || 1;
    return await this.treesService.updatePhysical(+id, userId, updatePhysicalDto);
  }

  @Get(':id/physical-history')
  @ApiOperation({ summary: 'Get physical measurement history for a tree' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Physical measurement history.' })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  async getPhysicalHistory(
    @Param('id') id: string,
    @Query() query: PhysicalHistoryQueryDto,
  ) {
    return await this.treesService.getPhysicalHistory(+id, query);
  }

  private assertXlsxFile(file: Express.Multer.File | undefined): void {
    if (!file) {
      throw new BadRequestException('Excel file is required');
    }
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('Only .xlsx files are supported');
    }
  }
}
