import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditLog } from '../../entities/auditLog.entity';
import { AuditLogService } from './auditLog.service';
import { AuditLogController } from './auditLog.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    // Provide JwtModule directly so AuditLogController can use JwtAuthGuard
    // without importing AuthModule (which would create a circular dependency:
    // AuthModule → AuditLogModule → AuthModule).
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'fallback_secret',
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
