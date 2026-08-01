// Must stay first: it populates the environment before any module that reads
// configuration at import time is evaluated.
import './config/load-env.js';

import process from 'node:process';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { checkDatabaseConnection, disconnectPrisma } from './shared/database/prisma.js';
import { disconnectRedis, getRedisClient } from './shared/cache/redis.client.js';
import { getLogger } from './shared/utils/logger.js';

/**
 * Server entry point.
 *
 * Configuration is validated before anything else, so a misconfigured process
 * fails immediately with a clear message instead of failing per request.
 */

async function start(): Promise<void> {
  const env = getEnv();
  const logger = getLogger();

  try {
    await checkDatabaseConnection();
  } catch (error) {
    logger.fatal({ err: error }, 'Could not connect to the database. Shutting down.');
    process.exitCode = 1;
    return;
  }

  // Starts connecting in the background. Never awaited: a slow or absent Redis
  // must not delay startup, and the application runs correctly without it.
  getRedisClient();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'Greenstone backend started');
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutting down');

    server.close(() => {
      void Promise.allSettled([disconnectPrisma(), disconnectRedis()]).finally(() => {
        process.exit(0);
      });
    });

    // Do not hang forever on connections that refuse to close.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
}

void start().catch((error: unknown) => {
  // The logger may not exist yet if configuration failed to parse.
  console.error('Failed to start the backend:', error);
  process.exit(1);
});
