import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load repo-root .env before any other module imports rely on env vars.
// services/api/dist/main.js sits two levels deep at runtime
// (and three when running ts-node from src), so resolve from there.
config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../../../../.env') });

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const widgetCdnUrl = process.env.WIDGET_CDN_URL ?? 'http://localhost:5173';
  const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://localhost:3001';
  app.enableCors({
    origin: [widgetCdnUrl, dashboardUrl],
    credentials: true,
  });

  const port = Number.parseInt(process.env.API_PORT ?? '3000', 10);
  await app.listen(port);

  const logger = new Logger('bootstrap');
  logger.log(`AvatarDesk API listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  const logger = new Logger('bootstrap');
  logger.error('failed to start API', err);
  process.exit(1);
});
