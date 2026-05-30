import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceTask } from '../../entities/maintenance-task.entity';
import { Tree } from '../../entities/tree.entity';
import { User } from '../auth/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/auditLog.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenanceTask, Tree, User]),
    AuthModule,
    AuditLogModule,
    NotificationsModule,
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
