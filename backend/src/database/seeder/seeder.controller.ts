import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SeederService } from './seeder.service';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';

@ApiTags('seed')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seed')
export class SeederController {
  constructor(private readonly seederService: SeederService) {}

  @Post()
  @ApiOperation({
    summary: 'Populate reference tables with sample data',
    description:
      'Inserts TreeSpecies and AdministrativeArea seed rows. Safe to call multiple times — existing rows are skipped.',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns the number of rows inserted for each table.',
    schema: {
      example: { species: 5, areas: 5 },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async seed() {
    return this.seederService.seed();
  }
}
