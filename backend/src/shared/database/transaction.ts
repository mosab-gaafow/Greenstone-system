import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { getPrisma } from './prisma.js';

/**
 * Database client usable both inside and outside a transaction.
 *
 * Repositories accept this type so the same function works standalone or as part
 * of a larger transactional operation.
 */
export type TransactionClient = Prisma.TransactionClient;
export type DbClient = PrismaClient | TransactionClient;

export interface TransactionOptions {
  /** Milliseconds the interactive transaction may run before rollback. */
  timeout?: number;
  /** Milliseconds to wait for a connection from the pool. */
  maxWait?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Runs `handler` inside a database transaction.
 *
 * Sensitive operations — stock, balances, payments, approvals and document
 * numbering — must go through here so that the business change and its audit
 * record commit or roll back together.
 *
 * See docs/technical-blueprint.md sections 7.4 and 11.6.
 */
export async function runInTransaction<TResult>(
  handler: (tx: TransactionClient) => Promise<TResult>,
  options: TransactionOptions = {},
  client: PrismaClient = getPrisma(),
): Promise<TResult> {
  return client.$transaction(handler, options);
}

/**
 * Locks rows with `SELECT ... FOR UPDATE`.
 *
 * Prisma's query builder has no `FOR UPDATE`, so pessimistic locking must be
 * issued as raw SQL on the transaction client. Calling this outside a
 * transaction gives no protection, because the lock would be released
 * immediately.
 *
 * `table` and `column` are never user input — callers pass fixed identifiers.
 */
export async function lockRowsForUpdate(
  tx: TransactionClient,
  table: string,
  column: string,
  value: string | number,
): Promise<void> {
  assertSafeIdentifier(table);
  assertSafeIdentifier(column);

  await tx.$queryRawUnsafe(`SELECT 1 FROM \`${table}\` WHERE \`${column}\` = ? FOR UPDATE`, value);
}

const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertSafeIdentifier(identifier: string): void {
  if (!SAFE_IDENTIFIER.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
}
