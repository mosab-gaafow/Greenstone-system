import {
  countPendingInBatch,
  findCuringRecordById,
  findCuringRecords,
  releaseCuringRecord,
  updateCuringDuration,
  type CuringRecordRow,
} from './curing.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import {
  BusinessRuleViolationError,
  InvalidDocumentStatusError,
  ResourceNotFoundError,
} from '../../shared/errors/app-error.js';
import * as productionService from '../production/production.service.js';
import * as ordersService from '../orders/orders.service.js';
import * as finishedStockService from '../finished-stock/finished-stock.service.js';
import * as brokenProductsService from '../broken-products/broken-products.service.js';
import type {
  ChangeCuringDurationInput,
  CuringRecordSummary,
  ListCuringFilters,
  ListCuringResult,
  ReleaseCuringInput,
} from './curing.types.js';

/**
 * Curing business logic. See business-blueprint section 2.8 and
 * docs/implementation-plan.md Phase 6B.
 *
 * A curing record is only ever created alongside its production item
 * (`production.service.ts`) — there is no standalone "start curing"
 * endpoint.
 *
 * Release requires `now >= plannedCompletion` using whichever duration is
 * currently selected. The only way to release a `THREE_DAYS` record before
 * the full three days is the explicit, audited change-to-`TWO_DAYS` action —
 * there is no separate early-release override, and `TWO_DAYS` is already the
 * shortest selectable duration, which is what makes it the absolute floor.
 *
 * Curing breakage hits the excess portion first, protecting the customer's
 * committed quantity: `orderPortion = min(allocatedQuantity,
 * releasedQuantity)`, `excessPortion = releasedQuantity - orderPortion`.
 */

const AUDIT_MODULE = 'curing';
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export async function listCuring(filters: ListCuringFilters): Promise<ListCuringResult> {
  const { rows, total } = await findCuringRecords(filters);

  return { records: rows.map(toSummary), totalRecords: total };
}

export async function getCuring(id: string): Promise<CuringRecordSummary> {
  return toSummary(await requireCuringRecord(id));
}

/**
 * Shortens a `THREE_DAYS` curing record to `TWO_DAYS`. One-directional only
 * — there is no lengthening action. Admin/Super Admin only: unlike release,
 * there is no capability override for this action.
 */
export async function changeDuration(
  id: string,
  input: ChangeCuringDurationInput,
  context: RequestContext,
): Promise<CuringRecordSummary> {
  const existing = await requireCuringRecord(id);

  if (existing.actualRelease) {
    throw new InvalidDocumentStatusError('This curing record has already been released.');
  }
  if (existing.currentDuration !== 'THREE_DAYS') {
    throw new BusinessRuleViolationError(
      'Only a three-day curing record can be changed, and only to two days.',
    );
  }

  const plannedCompletion = new Date(existing.startedAt.getTime() + TWO_DAYS_MS);
  const changedAt = new Date();

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const record = await updateCuringDuration(tx, id, {
      currentDuration: 'TWO_DAYS',
      plannedCompletion,
      durationChangeReason: input.reason,
      changedByUserId: context.user.id,
      changedAt,
    });

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CHANGE_CURING_DURATION',
      module: AUDIT_MODULE,
      entityType: 'CuringRecord',
      entityId: id,
      reason: input.reason,
      previousData: {
        currentDuration: existing.currentDuration,
        plannedCompletion: existing.plannedCompletion.toISOString(),
      },
      updatedData: {
        currentDuration: 'TWO_DAYS',
        plannedCompletion: plannedCompletion.toISOString(),
      },
    });

    return record;
  });

  return toSummary({ ...updated, productionItem: existing.productionItem });
}

/**
 * Releases a curing record. Order-allocated products become available for
 * the order; excess usable products enter general finished stock — see
 * business-blueprint section 2.8.
 */
export async function release(
  id: string,
  input: ReleaseCuringInput,
  context: RequestContext,
): Promise<CuringRecordSummary> {
  const existing = await requireCuringRecord(id);

  if (existing.actualRelease) {
    throw new InvalidDocumentStatusError('This curing record has already been released.');
  }

  const now = new Date();

  if (now < existing.plannedCompletion) {
    throw new BusinessRuleViolationError(
      'This curing record cannot be released before its planned completion.',
    );
  }

  const brokenQuantity = input.brokenQuantity ?? 0;

  if (brokenQuantity < 0 || brokenQuantity > existing.quantityEntering) {
    throw new BusinessRuleViolationError(
      'Broken quantity must be between zero and the quantity entering curing.',
    );
  }

  const releasedQuantity = existing.quantityEntering - brokenQuantity;
  const productionItem = await productionService.getProductionItemForRelease(
    existing.productionItemId,
  );
  const orderPortion = Math.min(productionItem.allocatedQuantity, releasedQuantity);
  const excessPortion = releasedQuantity - orderPortion;

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const record = await releaseCuringRecord(tx, id, {
      actualRelease: now,
      brokenQuantity,
      releasedQuantity,
      releasedByUserId: context.user.id,
    });

    if (orderPortion > 0) {
      await finishedStockService.recordCuringRelease(
        tx,
        productionItem.productId,
        orderPortion,
        'CURING_RELEASE',
        id,
        context,
      );

      let remaining = orderPortion;
      for (const allocation of productionItem.allocations) {
        if (remaining <= 0) {
          break;
        }
        const share = Math.min(allocation.quantity, remaining);
        if (share > 0) {
          await ordersService.incrementAllocatedQuantity(tx, allocation.orderItemId, share);
          remaining -= share;
        }
      }
    }

    if (excessPortion > 0) {
      await finishedStockService.recordCuringRelease(
        tx,
        productionItem.productId,
        excessPortion,
        'GENERAL_STOCK_RELEASE',
        id,
        context,
      );
    }

    if (brokenQuantity > 0) {
      await brokenProductsService.recordBrokenProductInTransaction(
        tx,
        {
          productId: productionItem.productId,
          quantity: brokenQuantity,
          stage: 'CURING',
          relatedEntityId: id,
        },
        context.user.id,
      );
    }

    const stillPending = await countPendingInBatch(tx, productionItem.productionBatchId);
    if (stillPending === 0) {
      await productionService.markBatchCompleted(tx, productionItem.productionBatchId);
    }

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'RELEASE_CURING',
      module: AUDIT_MODULE,
      entityType: 'CuringRecord',
      entityId: id,
      updatedData: { releasedQuantity, brokenQuantity, orderPortion, excessPortion },
    });

    return record;
  });

  return toSummary({ ...updated, productionItem: existing.productionItem });
}

// --- Helpers ----------------------------------------------------------------

async function requireCuringRecord(id: string): Promise<CuringRecordRow> {
  const record = await findCuringRecordById(id);

  if (!record) {
    throw new ResourceNotFoundError('That curing record was not found.');
  }

  return record;
}

function toSummary(row: CuringRecordRow): CuringRecordSummary {
  const now = new Date();
  let status: CuringRecordSummary['status'];
  if (row.actualRelease) {
    status = 'RELEASED';
  } else if (now >= row.plannedCompletion) {
    status = 'READY_FOR_RELEASE';
  } else {
    status = 'IN_PROGRESS';
  }

  return {
    id: row.id,
    productionItemId: row.productionItemId,
    productionBatchId: row.productionBatchId,
    productId: row.productionItem.productId,
    productName: row.productionItem.product.name,
    productionNumber: row.productionItem.productionBatch.productionNumber,
    quantityEntering: row.quantityEntering,
    originalDuration: row.originalDuration,
    currentDuration: row.currentDuration,
    startedAt: row.startedAt.toISOString(),
    plannedCompletion: row.plannedCompletion.toISOString(),
    actualRelease: row.actualRelease ? row.actualRelease.toISOString() : null,
    brokenQuantity: row.brokenQuantity,
    releasedQuantity: row.releasedQuantity,
    durationChangeReason: row.durationChangeReason,
    changedByUserId: row.changedByUserId,
    changedAt: row.changedAt ? row.changedAt.toISOString() : null,
    releasedByUserId: row.releasedByUserId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    status,
  };
}
