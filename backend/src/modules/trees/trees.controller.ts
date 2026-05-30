import { Controller, Delete, Get, Post, Body, Param, Query, UseGuards, Request, Patch, Res, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TreesService } from './trees.service';
import { CreateTreeDto } from './dto/create-tree.dto';
import { UpdateTreeDto } from './dto/update-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditAction } from '../../entities/auditLog.entity';
import type { Response } from 'express';

@ApiTags('trees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trees')
export class TreesController {
  constructor(
    private readonly treesService: TreesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Create a new tree (Admin/Manager only)' })
  @ApiResponse({ status: 201, description: 'Tree successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin or Manager role required.' })
  async create(@Body() createTreeDto: CreateTreeDto, @Request() req) {
    const userId = req.user?.userId ?? req.user?.id ?? null;
    return await this.treesService.create(createTreeDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all trees' })
  @ApiResponse({ status: 200, description: 'List of all trees.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll() {
    return await this.treesService.findAll();
  }

  @Get('locations')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Get tree locations for heatmap (Admin/Manager only)' })
  @ApiQuery({ name: 'area_id', required: false, type: Number, description: 'Filter by area ID' })
  @ApiQuery({ name: 'species_id', required: false, type: Number, description: 'Filter by species ID' })
  @ApiResponse({ status: 200, description: 'List of tree locations (ID and coordinates only).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin or Manager role required.' })
  async getLocations(
    @Query('area_id') areaId?: string,
    @Query('species_id') speciesId?: string,
  ) {
    return await this.treesService.findLocations(
      areaId ? +areaId : undefined,
      speciesId ? +speciesId : undefined,
    );
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

  @Get('nearby')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Staff')
  @ApiOperation({ summary: 'Find trees within a radius (PostGIS) - Available for Staff' })
  @ApiQuery({ name: 'latitude', required: true, type: Number, example: 16.0544 })
  @ApiQuery({ name: 'longitude', required: true, type: Number, example: 108.2022 })
  @ApiQuery({
    name: 'radius_meters',
    required: false,
    type: Number,
    example: 1000,
    description: 'Search radius in metres (default: 1000)',
  })
  @ApiResponse({ status: 200, description: 'Trees within the given radius.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Staff role or higher required.' })
  async findNearby(@Query() findNearbyDto: FindTreesNearbyDto) {
    return await this.treesService.findTreesWithinRadius(findNearbyDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tree by ID' })
  @ApiResponse({ status: 200, description: 'Tree found.' })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findOne(@Param('id') id: string) {
    return await this.treesService.findById(+id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get tree change history from audit logs' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of tree changes (UPDATE actions only).' 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getTreeHistory(@Param('id') id: string) {
    return await this.auditLogService.findAll({
      entity_type: 'tree',
      entity_id: +id,
      action: AuditAction.UPDATE,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Update a tree (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Tree successfully updated.' })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin or Manager role required.' })
  async update(
    @Param('id') id: string,
    @Body() updateTreeDto: UpdateTreeDto,
    @Request() req,
  ) {
    const userId = req.user?.userId ?? req.user?.id ?? null;
    return await this.treesService.update(+id, updateTreeDto, userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Delete a tree (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Tree successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin or Manager role required.' })
  async delete(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId ?? req.user?.id ?? null;
    await this.treesService.delete(+id, userId);
    return { success: true };
  }

  @Get(':id/qr-code')
  @ApiOperation({ summary: 'Generate QR code for a tree' })
  @ApiResponse({ 
    status: 200, 
    description: 'QR code PNG image generated successfully.',
    content: { 'image/png': { schema: { type: 'string', format: 'binary' } } } 
  })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getQRCode(@Param('id') id: string, @Res() res: Response) {
    const qrCodeBuffer = await this.treesService.generateQRCode(+id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="tree-${id}-qrcode.png"`);
    res.send(qrCodeBuffer);
  }

  @Get('qr/:qrCode')
  @ApiOperation({ summary: 'Get tree by QR code string' })
  @ApiResponse({ status: 200, description: 'Tree found by QR code.' })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findByQRCode(@Param('qrCode') qrCode: string) {
    const decodedQRCode = decodeURIComponent(qrCode);
    const tree = await this.treesService.findByQRCode(decodedQRCode);
    if (!tree) {
      throw new NotFoundException('Tree not found with the provided QR code');
    }
    return tree;
  }

  @Patch(':id/health')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Update tree health status (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Health status updated.' })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin or Manager role required.' })
  async updateHealth(
    @Param('id') id: string,
    @Body('health_status') healthStatus: string,
    @Request() req,
  ) {
    const userId = req.user?.userId ?? req.user?.id ?? null;
    return await this.treesService.updateHealthStatus(+id, healthStatus, userId);
  }

  @Get('check-code')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Check if tree code exists' })
  @ApiQuery({ name: 'code', required: true, type: String })
  @ApiQuery({ name: 'excludeId', required: false, type: Number })
  async checkTreeCode(
    @Query('code') code: string,
    @Query('excludeId') excludeId?: string,
  ) {
    // Trả về true/false trực tiếp để khớp với logic "return response.data" ở Frontend
    return await this.treesService.checkTreeCodeExists(
      code,
      excludeId ? +excludeId : undefined,
    );
  }

  @Get('check-location')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Check if location has existing tree' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'excludeId', required: false, type: Number })
  async checkLocation(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return await this.treesService.checkLocationExists(
      +lat,
      +lng,
      excludeId ? +excludeId : undefined,
    );
  }
}