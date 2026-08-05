import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client.js';
import { getEnv } from '../../config/env.js';

/**
 * Prisma client singleton.
 *
 * Prisma 7 requires a driver adapter. `@prisma/adapter-mariadb` is the adapter
 * for the `mysql` provider.
 */

const REQUIRED_TEST_DB_NAME = 'greenstone_test';

function assertTestDatabaseAllowed(url: string): void {
  const env = getEnv();
  if (env.isTest) {
    const dbName = new URL(url).pathname.replace(/^\//, '');
    if (dbName !== REQUIRED_TEST_DB_NAME) {
      throw new Error(
        `Tests require the database to be exactly "${REQUIRED_TEST_DB_NAME}". ` +
        `Active database is "${dbName}". ` +
        'Check DATABASE_URL and TEST_DATABASE_URL in your .env file.',
      );
    }
  }
}

let cachedClient: PrismaClient | undefined;

function createClient(databaseUrl: string): PrismaClient {
  assertTestDatabaseAllowed(databaseUrl);
  const adapter = new PrismaMariaDb(databaseUrl);
  return new PrismaClient({ adapter });
}

export function getPrisma(): PrismaClient {
  cachedClient ??= createClient(getEnv().DATABASE_URL);
  return cachedClient;
}

/**
 * Builds an isolated client against an explicit URL. Used by the test harness so
 * tests never share the development connection.
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  return createClient(databaseUrl);
}

/**
 * Verifies the database answers a trivial query. Used by the readiness endpoint
 * and on startup.
 */
export async function checkDatabaseConnection(client: PrismaClient = getPrisma()): Promise<void> {
  await client.$queryRaw`SELECT 1`;
}

export async function disconnectPrisma(): Promise<void> {
  if (cachedClient) {
    await cachedClient.$disconnect();
    cachedClient = undefined;
  }
}
