import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';
import { SeederController } from './seeder.controller';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { Role } from '../../entities/role.entity';
import { User } from '../../modules/auth/user.entity';
import { Tree } from '../../entities/tree.entity';
import { MaintenanceTask } from '../../entities/maintenance-task.entity';
import { AuthModule } from '../../modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TreeSpecies,
      AdministrativeArea,
      Role,
      User,
      Tree,
      MaintenanceTask,
    ]),
    AuthModule,
  ],
  controllers: [SeederController],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
