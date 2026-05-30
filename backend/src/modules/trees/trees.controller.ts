import { Controller, Delete, Get, Post, Body, Param, Query, UseGuards, Request, Patch, Res, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TreesService } from './trees.service';
import { CreateTreeDto } from './dto/create-tree.dto';
import { UpdateTreeDto } from './dto/update-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';

@ApiTags('trees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trees')
export class TreesController {
  constructor(private readonly treesService: TreesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tree' })
  @ApiResponse({ status: 201, description: 'Tree successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
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
  @ApiOperation({ summary: 'Find trees within a radius (PostGIS)' })
  @ApiQuery({
    name: 'latitude',
    required: true,
    type: Number,
    example: 16.0544,
  })
  @ApiQuery({
    name: 'longitude',
    required: true,
    type: Number,
    example: 108.2022,
  })
  @ApiQuery({
    name: 'radius_meters',
    required: false,
    type: Number,
    example: 1000,
    description: 'Search radius in metres (default: 1000)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trees within the given radius, ordered by distance.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findNearby(@Query() findNearbyDto: FindTreesNearbyDto) {
    return await this.treesService.findTreesWithinRadius(findNearbyDto);
  }

  @Get('species')
  @ApiOperation({ summary: 'Get all tree species' })
  @ApiResponse({ status: 200, description: 'List of all tree species.' })

  @Get('areas')
  @ApiOperation({ summary: 'Get all administrative areas' })
  @ApiResponse({ status: 200, description: 'List of all administrative areas.' })

  @Get(':id')
  @ApiOperation({ summary: 'Get a tree by ID' })
  @ApiResponse({ status: 200, description: 'Tree found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findOne(@Param('id') id: string) {
    return await this.treesService.findById(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tree' })
  @ApiResponse({ status: 200, description: 'Tree successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateTreeDto: UpdateTreeDto,
    @Request() req,
  ) {
    const userId = req.user?.userId ?? req.user?.id ?? null;
    return await this.treesService.update(+id, updateTreeDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tree' })
  @ApiResponse({ status: 200, description: 'Tree successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Tree not found.' })
  async delete(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId ?? req.user?.id ?? null;
    await this.treesService.delete(+id, userId);
    return { success: true };
  @Get(':id/qrcode')
  @ApiOperation({ summary: 'Generate QR code for a tree' })
  @ApiResponse({ 
    status: 200, 
    description: 'QR code PNG image generated successfully.',
    content: {
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
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
    // Decode URL-encoded QR code (e.g., cayxanh%3A%2F%2Ftree%2F42 -> cayxanh://tree/42)
    const decodedQRCode = decodeURIComponent(qrCode);
    const tree = await this.treesService.findByQRCode(decodedQRCode);
    
    if (!tree) {
      throw new NotFoundException('Tree not found with the provided QR code');
    }
    
    return tree;
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
}
