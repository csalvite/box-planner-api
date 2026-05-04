import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { instance } from './winston.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance: instance,
    }),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const isDevelopment = configService.get<string>('NODE_ENV') !== 'production';
  const allowedOrigins = [
    ...(frontendUrl ? [frontendUrl] : []),
    ...(isDevelopment ? ['http://localhost:3000'] : []),
  ];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BoxPlanner API')
    .setDescription(
      'API SaaS para planificación de entrenamientos, organizaciones y gestión de contenido de boxeo.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(configService.get<string>('PORT') ?? 3001);
  instance.verbose(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
