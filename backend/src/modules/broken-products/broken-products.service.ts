import {
  findBrokenProductRecords,
  insertBrokenProductRecord,
  type BrokenProductRecordRow,
} from './broken-products.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError } from '../../shared/errors/app-error.js';
import * as productsService from '../products/products.service.js';
import * as finishedStockService from '../finished-stock/finished-stock.service.js';
import type {
  BrokenProductRecordSummary,
  CreateBrokenProductRecordInput,
  ListBrokenProductRecordsFilters,
  ListBrokenProductRecordsResult,
} from './broken-products.types.js';

/**
 * Broken product business logic. See business-blueprint section 2.11.
 *
 * Recorded during production, curing, finished-stock handling, and delivery
 * handling — this module only has a real stock effect at the
 * `FINISHED_STOCK` stage today: `PRODUCTION`/`CURING` writers arrive with
 * Phase 6B, and `DELIVERY` with Phase 8. Those phases will call
 * `insertBrokenProductRecord` from inside their own transactions (the same
 * pattern this service uses for `FINISHED_STOCK`), not invent a new one.
 */

const AUDIT_MODULE = 'broken-products';

export async function listBrokenProductRecords(
  filters: ListBrokenProductRecordsFilters,
): Promise<ListBrokenProductRecordsResult> {
  const { rows, total } = await findBrokenProductRecords(filters);

  return { records: rows.map(toSummary), totalRecords: total };
}

/**
 * Inserts a broken-product record inside the caller's existing transaction —
 * used by `production.service.ts` (`PRODUCTION` stage) and
 * `curing.service.ts` (`CURING` stage), the same "accept a caller-supplied
 * `tx`" pattern used throughout this codebase for cross-module writes. Does
 * not write its own audit entry; the caller's broader action does.
 */
export async function recordBrokenProductInTransaction(
  tx: TransactionClient,
  input: CreateBrokenProductRecordInput,
  recordedByUserId: string | null,
): Promise<BrokenProductRecordRow> {
  return insertBrokenProductRecord(tx, { ...input, recordedByUserId });
}

export async function createBrokenProductRecord(
  input: CreateBrokenProductRecordInput,
  context: RequestContext,
): Promise<BrokenProductRecordSummary> {
  await productsService.getProduct(input.productId);

  if (input.quantity <= 0) {
    throw new BusinessRuleViolationError('Enter a quantity greater than zero.');
  }

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const record = await recordBrokenProductInTransaction(tx, input, context.user.id);

    if (input.stage === 'FINISHED_STOCK') {
      await finishedStockService.recordBrokenStockMovement(
        tx,
        input.productId,
        input.quantity,
        record.id,
        context,
      );
    }

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_BROKEN_PRODUCT_RECORD',
      module: AUDIT_MODULE,
      entityType: 'BrokenProductRecord',
      entityId: record.id,
      reason: input.reason ?? null,
      updatedData: toAuditSnapshot(record),
    });

    return record;
  });

  return toSummary(created);
}

function toSummary(row: BrokenProductRecordRow): BrokenProductRecordSummary {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    quantity: row.quantity,
    stage: row.stage,
    relatedEntityId: row.relatedEntityId,
    reason: row.reason,
    recordedByUserId: row.recordedByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

function toAuditSnapshot(row: BrokenProductRecordRow): Record<string, unknown> {
  return {
    productId: row.productId,
    quantity: row.quantity,
    stage: row.stage,
    relatedEntityId: row.relatedEntityId,
    reason: row.reason,
  };
}
