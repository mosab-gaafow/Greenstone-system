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

const REQUIRED_TEST_DB = 'greenstone_test';

function requireTestDatabase(url: string | undefined): string {
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Add it to backend/.env before running the tests.',
    );
  }

  const name = new URL(url).pathname.replace(/^\//, '');
  if (name !== REQUIRED_TEST_DB) {
    throw new Error(
      `Tests require the database to be exactly "${REQUIRED_TEST_DB}". ` +
      `TEST_DATABASE_URL points to "${name}". ` +
      'Update TEST_DATABASE_URL in your .env file.',
    );
  }

  return url;
}

export function getTestPrisma(): PrismaClient {
  const url = requireTestDatabase(process.env['TEST_DATABASE_URL']);
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
  'customer_payment_allocations',
  'receipts',
  'customer_payments',
  'invoice_items',
  'invoices',
  'delivery_items',
  'deliveries',
  'customer_credit_overrides',
  'customer_opening_balances',
  'curing_records',
  'production_order_allocations',
  'raw_material_usages',
  'production_items',
  'production_batches',
  'order_items',
  'orders',
  'broken_product_records',
  'finished_stock_movements',
  'finished_stock_balances',
  'purchase_payment_allocations',
  'purchase_payments',
  'purchase_items',
  'purchases',
  'supplier_opening_balances',
  'raw_material_movements',
  'raw_material_stock_balances',
  'raw_materials',
  'measurement_units',
  'products',
  'customer_addresses',
  'customers',
  'employees',
  'drivers',
  'vehicles',
  'vehicle_owners',
  'suppliers',
  'company_settings',
  'generated_documents',
  'stored_files',
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
 *
 * Everything runs inside one `$transaction`, which pins every statement to a
 * single pooled connection. Issuing the statements directly on `prisma`
 * instead does not: the mariadb driver adapter may hand separate calls
 * different connections, so `SET FOREIGN_KEY_CHECKS = 0` from one call can
 * silently fail to apply to a `DELETE` on another — harmless until a table
 * has a real foreign key into a table listed earlier here, which surfaces as
 * an intermittent constraint-violation failure.
 */
export async function truncateAll(): Promise<void> {
  // Double-check: refuse to truncate if TEST_DATABASE_URL doesn't end with _test.
  requireTestDatabase(process.env['TEST_DATABASE_URL']);
  const prisma = getTestPrisma();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) {
      await tx.$executeRawUnsafe(`DELETE FROM \`${table}\``);
    }
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  });
}
