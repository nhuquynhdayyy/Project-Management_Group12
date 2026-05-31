import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemSetting } from '../../entities/system-setting.entity';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system settings (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all system settings.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async getAllSettings(): Promise<SystemSetting[]> {
    return this.settingsService.getAllSettings();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a specific setting by key (Admin only)' })
  @ApiParam({ name: 'key', description: 'Setting key' })
  @ApiResponse({
    status: 200,
    description: 'Setting value.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async getSetting(@Param('key') key: string): Promise<{ key: string; value: string }> {
    const value = await this.settingsService.getSetting(key);
    return { key, value };
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a system setting (Admin only)' })
  @ApiParam({ name: 'key', description: 'Setting key' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['value'],
      properties: {
        value: { type: 'string', example: '15' },
        description: { type: 'string', example: 'Bán kính geofencing' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Setting updated successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async updateSetting(
    @Param('key') key: string,
    @Body('value') value: string,
    @Body('description') description?: string,
  ): Promise<SystemSetting> {
    return this.settingsService.updateSetting(key, value, description);
  }
}
