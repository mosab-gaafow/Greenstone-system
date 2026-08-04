import type { FinishedStockMovementType } from '../../generated/prisma/client.js';
import {
  ensureBalance,
  findMovements,
  insertMovement,
  lockBalance,
  reserveStock,
  setBalanceQuantities,
  type BalanceRow,
  type MovementRow,
} from './finished-stock.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, InsufficientFinishedStockError } from '../../shared/errors/app-error.js';
import * as productsService from '../products/products.service.js';
import type {
  AdjustFinishedStockInput,
  FinishedStockBalanceDetail,
  FinishedStockMovementSummary,
  ListFinishedStockMovementsFilters,
  ListFinishedStockMovementsResult,
  SetOpeningFinishedStockInput,
} from './finished-stock.types.js';

/**
 * Finished stock business logic. See business-blueprint section 2.9.
 *
 * **Never cached** — physical/reserved/available quantities are read live on
 * every request, per docs/technical-blueprint.md section 4A.3 ("finished
 * stock availability during a transaction" is one of the values that must
 * never be served from Redis).
 *
 * Balance updates always run inside a transaction holding a row lock
 * (`lockBalance`), never a bare read-then-write. `reservedQuantity` is not
 * touched here — it is written starting in Phase 8 (Stock Reservation, tied
 * to Delivery); this module only ever moves `physicalQuantity`, recomputing
 * `availableQuantity` alongside it in the same update.
 */

const AUDIT_MODULE = 'finished-stock';

export async function getStock(productId: string): Promise<FinishedStockBalanceDetail> {
  await productsService.getProduct(productId);

  return toDetail(await ensureBalance(productId));
}

export async function listMovements(
  productId: string,
  filters: ListFinishedStockMovementsFilters,
): Promise<ListFinishedStockMovementsResult> {
  await productsService.getProduct(productId);

  const { rows, total } = await findMovements(productId, filters);

  return { movements: rows.map(toMovementSummary), totalRecords: total };
}

/**
 * Sets physical stock to an absolute quantity — business-blueprint section
 * 2.10. Available quantity is recomputed alongside it; reserved quantity is
 * untouched (nothing can be reserved before Phase 8's Delivery exists).
 */
export async function setOpeningStock(
  productId: string,
  input: SetOpeningFinishedStockInput,
  context: RequestContext,
): Promise<FinishedStockBalanceDetail> {
  await productsService.getProduct(productId);
  await ensureBalance(productId);

  if (input.quantity < 0) {
    throw new BusinessRuleViolationError('Opening quantity cannot be negative.');
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const balance = await lockBalance(tx, productId);
    const delta = input.quantity - balance.physicalQuantity;
    const availableQuantity = input.quantity - balance.reservedQuantity;

    const newBalance = await setBalanceQuantities(tx, productId, input.quantity, availableQuantity);

    await insertMovement(tx, {
      productId,
      movementType: 'OPENING',
      quantity: delta,
      balanceAfter: input.quantity,
      reason: input.reason ?? null,
      createdByUserId: context.user.id,
    });

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'SET_FINISHED_STOCK_OPENING',
      module: AUDIT_MODULE,
      entityType: 'FinishedStockBalance',
      entityId: productId,
      reason: input.reason ?? null,
      previousData: { physicalQuantity: balance.physicalQuantity },
      updatedData: { physicalQuantity: input.quantity },
    });

    return newBalance;
  });

  return toDetail(updated);
}

/**
 * Applies a signed delta to physical stock, with a required written reason.
 */
export async function adjustStock(
  productId: string,
  input: AdjustFinishedStockInput,
  context: RequestContext,
): Promise<FinishedStockBalanceDetail> {
  await productsService.getProduct(productId);
  await ensureBalance(productId);

  if (input.quantity === 0) {
    throw new BusinessRuleViolationError('Enter a non-zero adjustment quantity.');
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const balance = await lockBalance(tx, productId);
    const newPhysical = balance.physicalQuantity + input.quantity;

    assertNotBelowReserved(newPhysical, balance.reservedQuantity);

    const availableQuantity = newPhysical - balance.reservedQuantity;
    const newBalance = await setBalanceQuantities(tx, productId, newPhysical, availableQuantity);

    await insertMovement(tx, {
      productId,
      movementType: input.quantity > 0 ? 'POSITIVE_ADJUSTMENT' : 'NEGATIVE_ADJUSTMENT',
      quantity: input.quantity,
      balanceAfter: newPhysical,
      reason: input.reason,
      createdByUserId: context.user.id,
    });

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'ADJUST_FINISHED_STOCK',
      module: AUDIT_MODULE,
      entityType: 'FinishedStockBalance',
      entityId: productId,
      reason: input.reason,
      previousData: { physicalQuantity: balance.physicalQuantity },
      updatedData: { physicalQuantity: newPhysical },
    });

    return newBalance;
  });

  return toDetail(updated);
}

/**
 * Records a broken-stock movement inside the caller's existing transaction.
 * Used by `broken-products.service.ts` when a broken record is created at
 * the `FINISHED_STOCK` stage — the same "accept a caller-supplied `tx`"
 * pattern `customer-credit.service.ts` uses for override records.
 */
export async function recordBrokenStockMovement(
  tx: TransactionClient,
  productId: string,
  quantity: number,
  relatedEntityId: string | null,
  context: RequestContext,
): Promise<void> {
  const balance = await lockBalance(tx, productId);
  const newPhysical = balance.physicalQuantity - quantity;

  if (newPhysical < 0) {
    throw new InsufficientFinishedStockError(
      'Not enough physical stock to record this many broken pieces.',
    );
  }

  assertNotBelowReserved(newPhysical, balance.reservedQuantity);

  const availableQuantity = newPhysical - balance.reservedQuantity;
  await setBalanceQuantities(tx, productId, newPhysical, availableQuantity);

  await insertMovement(tx, {
    productId,
    movementType: 'BROKEN',
    quantity: -quantity,
    balanceAfter: newPhysical,
    relatedEntityId,
    createdByUserId: context.user.id,
  });
}

/**
 * Credits physical stock at curing release, inside the caller's existing
 * transaction. Used by `curing.service.ts` — `CURING_RELEASE` for the
 * portion earmarked for an order, `GENERAL_STOCK_RELEASE` for the excess
 * portion (business-blueprint section 2.8). Both are still physically in the
 * yard either way; the movement type only distinguishes what it is earmarked
 * for. Ensures the balance row exists first, since a product's first
 * finished-stock activity may well be a curing release rather than an
 * opening entry.
 */
export async function recordCuringRelease(
  tx: TransactionClient,
  productId: string,
  quantity: number,
  movementType: Extract<FinishedStockMovementType, 'CURING_RELEASE' | 'GENERAL_STOCK_RELEASE'>,
  relatedEntityId: string,
  context: RequestContext,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  await ensureBalance(productId, tx);
  const balance = await lockBalance(tx, productId);
  const newPhysical = balance.physicalQuantity + quantity;
  const availableQuantity = newPhysical - balance.reservedQuantity;

  await setBalanceQuantities(tx, productId, newPhysical, availableQuantity);

  await insertMovement(tx, {
    productId,
    movementType,
    quantity,
    balanceAfter: newPhysical,
    relatedEntityId,
    createdByUserId: context.user.id,
  });
}

/**
 * Reserves finished stock inside the caller's existing transaction. Used by
 * `deliveries.service.ts` when a PLANNED delivery is created. Does NOT write
 * a `FinishedStockMovement` — only physical-stock-affecting changes do.
 *
 * The caller must already hold a lock on the balance row via `lockBalance`.
 */
export async function reserveStockForDelivery(
  tx: TransactionClient,
  productId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }
  await reserveStock(tx, productId, quantity);
}

// --- Helpers ----------------------------------------------------------------

function assertNotBelowReserved(physicalQuantity: number, reservedQuantity: number): void {
  if (physicalQuantity < reservedQuantity) {
    throw new InsufficientFinishedStockError(
      'This would take physical stock below what is already reserved.',
    );
  }
}

function toDetail(row: BalanceRow): FinishedStockBalanceDetail {
  return {
    productId: row.productId,
    physicalQuantity: row.physicalQuantity,
    reservedQuantity: row.reservedQuantity,
    availableQuantity: row.availableQuantity,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMovementSummary(row: MovementRow): FinishedStockMovementSummary {
  return {
    id: row.id,
    movementType: row.movementType,
    quantity: row.quantity,
    balanceAfter: row.balanceAfter,
    relatedEntityId: row.relatedEntityId,
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}
