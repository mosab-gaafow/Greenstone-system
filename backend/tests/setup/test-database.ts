import process from 'node:process';
import { createPrismaClient } from '../../src/shared/database/prisma.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

/**
 * Test database helper.
 *
 * Every integration test uses this client so no test ever touches the
 * development connection.
 */

let client: PrismaClient | undefined;

export function getTestPrisma(): PrismaClient {
  const url = process.env['TEST_DATABASE_URL'];

  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set.');
  }

  client ??= createPrismaClient(url);
  return client;
}

export async function disconnectTestPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}

/**
 * Removes all rows from the infrastructure tables.
 *
 * Truncation is faster than delete and resets nothing the tests rely on.
 * Foreign key checks are disabled around it so table order does not matter as
 * business tables are added in later phases.
 */
export async function truncateAll(): Promise<void> {
  const prisma = getTestPrisma();

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE `document_sequences`');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE `audit_logs`');
  } finally {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  }
}
