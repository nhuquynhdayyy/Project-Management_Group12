import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

  @Get('nearby')
  @ApiOperation({ summary: 'Find trees within a radius (PostGIS)' })
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
