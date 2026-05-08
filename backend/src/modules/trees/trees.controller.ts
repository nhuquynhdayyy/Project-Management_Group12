import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TreesService } from './trees.service';
import { CreateTreeDto } from './dto/create-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
}
