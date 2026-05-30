import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { TreesModule } from './modules/trees/trees.module';
import { SeederModule } from './database/seeder/seeder.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { AreasModule } from './modules/areas/areas.module';
import { CloudStorageService } from './services/cloud-storage.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'urban_tree',
      autoLoadEntities: true,
      synchronize: true,
    }),

    AuthModule,
    TreesModule,
    SeederModule,
    MaintenanceModule,
    AreasModule,
  ],
  controllers: [AppController],
  providers: [CloudStorageService],
  exports: [CloudStorageService],
})
export class AppModule {}