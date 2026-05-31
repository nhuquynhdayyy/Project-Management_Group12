import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreesController } from './trees.controller';
import { TreesService } from './trees.service';
import { ImportService } from './import.service';
import { Tree } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { TreePhysicalLog } from '../../entities/tree-physical-log.entity';
import { MaintenanceTask } from '../../entities/maintenance-task.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/auditLog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tree, TreeSpecies, AdministrativeArea, TreePhysicalLog, MaintenanceTask]),
    AuthModule,
    AuditLogModule,
  ],
  controllers: [TreesController],
  providers: [TreesService, ImportService],
  exports: [TreesService],
})
export class TreesModule {}
