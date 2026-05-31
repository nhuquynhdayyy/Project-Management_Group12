import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { TreesModule } from './modules/trees/trees.module';
import { SeederModule } from './database/seeder/seeder.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { AreasModule } from './modules/areas/areas.module';
import { AuditLogModule } from './modules/audit-log/auditLog.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { StatsModule } from './modules/stats/stats.module';
import { CloudStorageService } from './services/cloud-storage.service';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: (config.get<string>('DB_TYPE') as any) || 'postgres',

        host: config.get<string>('DB_HOST') || 'localhost',

        port: parseInt(config.get<string>('DB_PORT') || '5432', 10),

        username: config.get<string>('DB_USERNAME') || 'postgres',

        password: config.get<string>('DB_PASSWORD') || '123456',

        database:
          config.get<string>('DB_DATABASE') ||
          config.get<string>('DB_NAME') ||
          'urban_tree',

        autoLoadEntities: true,

        synchronize: true,
      }),
    }),

    AuthModule,
    TreesModule,
    SeederModule,
    MaintenanceModule,
    AreasModule,
    AuditLogModule,
    NotificationsModule,
    IncidentsModule,
    StatsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [CloudStorageService],
  exports: [CloudStorageService],
})
export class AppModule {}
