import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { createOpenApiDocument } from './openapi';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  // Off in production; the document is still generated for the typed client.
  if (process.env.ENABLE_DOCS === '1') {
    SwaggerModule.setup('docs', app, createOpenApiDocument(app));
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
