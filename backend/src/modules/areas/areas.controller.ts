import { Controller, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('areas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Create a new administrative area (Admin/Manager only)' })
  @ApiResponse({ status: 201, description: 'Area successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request (duplicate name or invalid parent).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient permissions).' })
  async create(@Body() createAreaDto: CreateAreaDto) {
    return await this.areasService.create(createAreaDto);
  }

  @Patch(':id')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Update area name (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Area successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad request (duplicate name).' })
  @ApiResponse({ status: 404, description: 'Area not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient permissions).' })
  async update(@Param('id') id: string, @Body() updateAreaDto: UpdateAreaDto) {
    return await this.areasService.update(+id, updateAreaDto);
  }

  @Delete(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Delete an area (Admin only)' })
  @ApiResponse({ status: 200, description: 'Area successfully deleted.' })
  @ApiResponse({ status: 400, description: 'Bad request (area has trees or children).' })
  @ApiResponse({ status: 404, description: 'Area not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin only).' })
  async delete(@Param('id') id: string) {
    return await this.areasService.delete(+id);
  }
}
