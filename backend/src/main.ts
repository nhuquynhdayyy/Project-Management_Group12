import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SeederService } from './database/seeder/seeder.service';
import { SettingsService } from './modules/settings/settings.service';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow requests from web frontend, mobile app, and local dev tools
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  // Automatically exclude @Exclude() fields (e.g. password) from all responses
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Auto-seed reference tables in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const seeder = app.get(SeederService);
    await seeder.seed();
  }

  // Initialize default system settings
  const settingsService = app.get(SettingsService);
  await settingsService.initializeDefaultSettings();

  const config = new DocumentBuilder()
    .setTitle('Urban Green Infrastructure API')
    .setDescription(
      'API documentation for the Urban Green Infrastructure Management System',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
