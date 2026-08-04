import type {
  FinishedStockBalance,
  FinishedStockMovement,
  FinishedStockMovementType,
  Prisma,
} from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import { lockRowsForUpdate, type DbClient, type TransactionClient } from '../../shared/database/transaction.js';
import type { ListFinishedStockMovementsFilters } from './finished-stock.types.js';

/**
 * Finished stock database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type BalanceRow = FinishedStockBalance;
export type MovementRow = FinishedStockMovement;

/**
 * Creates the zero-quantity balance row if it does not already exist.
 *
 * Idempotent, like `ensureSettingsRow` — a product created before this module
 * shipped has no balance row yet, so the first read or write creates it
 * rather than treating "no balance" as a special case everywhere else.
 */
export async function ensureBalance(
  productId: string,
  client: DbClient = getPrisma(),
): Promise<BalanceRow> {
  return client.finishedStockBalance.upsert({
    where: { productId },
    create: { productId },
    update: {},
  });
}

export async function findBalance(
  productId: string,
  client: DbClient = getPrisma(),
): Promise<BalanceRow | null> {
  return client.finishedStockBalance.findUnique({ where: { productId } });
}

/**
 * Locks the balance row for the rest of the transaction, then returns it.
 * Callers must be inside `runInTransaction`, and must have already called
 * `ensureBalance` outside it — locking a nonexistent row acquires no lock.
 */
export async function lockBalance(tx: TransactionClient, productId: string): Promise<BalanceRow> {
  await lockRowsForUpdate(tx, 'finished_stock_balances', 'productId', productId);

  const balance = await tx.finishedStockBalance.findUnique({ where: { productId } });

  if (!balance) {
    throw new Error(`Product ${productId} has no finished-stock balance row.`);
  }

  return balance;
}

export async function setBalanceQuantities(
  tx: TransactionClient,
  productId: string,
  physicalQuantity: number,
  availableQuantity: number,
): Promise<BalanceRow> {
  return tx.finishedStockBalance.update({
    where: { productId },
    data: { physicalQuantity, availableQuantity, version: { increment: 1 } },
  });
}

export async function insertMovement(
  tx: TransactionClient,
  input: {
    productId: string;
    movementType: FinishedStockMovementType;
    quantity: number;
    balanceAfter: number;
    relatedEntityId?: string | null;
    reason?: string | null;
    createdByUserId?: string | null;
  },
): Promise<MovementRow> {
  return tx.finishedStockMovement.create({
    data: {
      productId: input.productId,
      movementType: input.movementType,
      quantity: input.quantity,
      balanceAfter: input.balanceAfter,
      relatedEntityId: input.relatedEntityId ?? null,
      reason: input.reason ?? null,
      createdByUserId: input.createdByUserId ?? null,
    },
  });
}

/**
 * Increments `reservedQuantity` and decrements `availableQuantity` inside the
 * caller's existing transaction. Does NOT touch `physicalQuantity` and does
 * NOT write a `FinishedStockMovement` — reservation is not a physical-stock
 * change. Added in Phase 8A.
 */
export async function reserveStock(
  tx: TransactionClient,
  productId: string,
  quantity: number,
): Promise<BalanceRow> {
  return tx.finishedStockBalance.update({
    where: { productId },
    data: {
      reservedQuantity: { increment: quantity },
      availableQuantity: { decrement: quantity },
      version: { increment: 1 },
    },
  });
}

/** Lists all finished-stock balances with product names for the stock page. */
export async function findAllStockBalances(
  client: DbClient = getPrisma(),
): Promise<
  { productId: string; productName: string; physicalQuantity: number; reservedQuantity: number; availableQuantity: number; updatedAt: Date }[]
> {
  const rows = await client.finishedStockBalance.findMany({
    include: { product: { select: { name: true } } },
    orderBy: { product: { name: 'asc' } },
  });

  return rows.map((row) => ({
    productId: row.productId,
    productName: row.product.name,
    physicalQuantity: row.physicalQuantity,
    reservedQuantity: row.reservedQuantity,
    availableQuantity: row.availableQuantity,
    updatedAt: row.updatedAt,
  }));
}

export async function findMovements(
  productId: string,
  filters: ListFinishedStockMovementsFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: MovementRow[]; total: number }> {
  const where: Prisma.FinishedStockMovementWhereInput = { productId };

  const [rows, total] = await Promise.all([
    client.finishedStockMovement.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    client.finishedStockMovement.count({ where }),
  ]);

  return { rows, total };
}
