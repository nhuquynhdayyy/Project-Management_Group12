import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { TreesService } from './trees.service';
import { CreateTreeDto } from './dto/create-tree.dto';
import { UpdateTreeDto } from './dto/update-tree.dto';
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
  @ApiQuery({
    name: 'species',
    required: false,
    type: String,
    description: 'Comma-separated species ids or common names.',
  })
  @ApiQuery({
    name: 'health_status',
    required: false,
    type: String,
    description: 'Specific health status, or danger for diseased/dead trees.',
  })
  @ApiResponse({ status: 200, description: 'List of all trees.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(
    @Query('species') species?: string,
    @Query('health_status') healthStatus?: string,
  ) {
    return await this.treesService.findAll({
      species,
      health_status: healthStatus,
    });
  }

  @Get('species')
  @ApiOperation({ summary: 'Get all tree species' })
  @ApiResponse({ status: 200, description: 'List of all species.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findSpecies() {
    return await this.treesService.findSpecies();
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
  }
}
