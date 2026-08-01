import process from 'node:process';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { checkDatabaseConnection, disconnectPrisma } from './shared/database/prisma.js';
import { getLogger } from './shared/utils/logger.js';

/**
 * Server entry point.
 *
 * Configuration is validated before anything else, so a misconfigured process
 * fails immediately with a clear message instead of failing per request.
 */

// Prisma 7 does not load .env automatically, and Node's own loader is used to
// avoid a dotenv dependency. In deployed environments the variables are already
// present, so a missing file is not an error.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file — rely on the ambient environment.
}

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

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'Greenstone backend started');
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutting down');

    server.close(() => {
      void disconnectPrisma().finally(() => {
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
