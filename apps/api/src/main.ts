import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DbErrorFilter } from './common/db-error-filter';
import { ZodValidationFilter } from './common/zod-filter';
import { env } from './env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ZodValidationFilter(), new DbErrorFilter());

  const config = new DocumentBuilder()
    .setTitle('Nusantara ERP API')
    .setDescription('Fase 0 — kontrak OpenAPI awal (health). Dikembangkan per fase.')
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(env.API_PORT);
  console.log(`API listening on :${env.API_PORT} (env=${env.NODE_ENV})`);
}

void bootstrap();
