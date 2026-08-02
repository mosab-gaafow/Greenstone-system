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
 * Every table the test suite clears, in no particular order.
 *
 * Add new tables here as later phases introduce them.
 */
const TABLES = [
  'document_sequences',
  'audit_logs',
  'products',
  'customer_addresses',
  'customers',
  'employees',
  'drivers',
  'vehicles',
  'suppliers',
  'company_settings',
  'user_capability_grants',
  'session',
  'account',
  'verification',
  'user',
] as const;

/**
 * Removes all rows from every table.
 *
 * `DELETE` rather than `TRUNCATE`: MySQL refuses to truncate a table that is
 * referenced by a foreign key, even with `FOREIGN_KEY_CHECKS = 0`, and `user` is
 * referenced by `audit_logs`. Disabling the checks still lets the deletes run in
 * any order.
 */
export async function truncateAll(): Promise<void> {
  const prisma = getTestPrisma();

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const table of TABLES) {
      await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
    }
  } finally {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  }
}
