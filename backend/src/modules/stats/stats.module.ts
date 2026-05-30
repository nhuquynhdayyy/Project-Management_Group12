import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tree } from '../../entities/tree.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { AuthModule } from '../auth/auth.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tree, AdministrativeArea]), AuthModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
