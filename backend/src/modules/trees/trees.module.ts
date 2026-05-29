import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreesController } from './trees.controller';
import { TreesService } from './trees.service';
import { Tree } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/auditLog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tree, TreeSpecies, AdministrativeArea]),
    AuthModule,
    AuditLogModule,
  ],
  controllers: [TreesController],
  providers: [TreesService],
  exports: [TreesService],
})
export class TreesModule {}
