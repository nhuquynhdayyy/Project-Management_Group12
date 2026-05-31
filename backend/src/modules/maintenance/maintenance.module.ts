import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceExportController } from './maintenance-export.controller';
import { TestExportController } from './test-export.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceExportService } from './maintenance-export.service';
import { ExportService } from './export.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MaintenanceTask } from '../../entities/maintenance-task.entity';
import { Tree } from '../../entities/tree.entity';
import { User } from '../auth/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/auditLog.module';
import { SettingsModule } from '../settings/settings.module';
import { CloudStorageService } from '../../services/cloud-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenanceTask, Tree, User]),
    AuthModule,
    AuditLogModule,
    SettingsModule,
  ],
  controllers: [MaintenanceController, MaintenanceExportController, TestExportController],
  providers: [MaintenanceService, MaintenanceExportService, ExportService, RolesGuard, CloudStorageService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
