/**
 * Writes the OpenAPI document to a file without starting the server or touching the
 * database, so the API client can be generated in CI.
 */
import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './openapi';

async function main(out: string) {
  const app = await NestFactory.create(AppModule, { preview: true, logger: false });
  writeFileSync(out, `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`);
  await app.close();
}

void main(process.argv[2] ?? 'openapi.json');
