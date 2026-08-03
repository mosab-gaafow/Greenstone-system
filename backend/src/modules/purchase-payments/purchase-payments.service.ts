import { Prisma } from '../../generated/prisma/client.js';
import {
  approvePurchasePaymentRow,
  findPurchasePaymentById,
  findPurchasePayments,
  insertPurchasePayment,
  reversePurchasePaymentRow,
  sumApprovedAllocationsForPurchase,
  type PurchasePaymentDetailRow,
  type PurchasePaymentRow,
} from './purchase-payments.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import {
  lockRowsForUpdate,
  runInTransaction,
  type TransactionClient,
} from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import { getStorageProvider, storeFile } from '../../shared/storage/storage.service.js';
import { insertStoredFile } from '../../shared/storage/storage.repository.js';
import * as suppliersService from '../suppliers/suppliers.service.js';
import * as purchasesService from '../purchases/purchases.service.js';
import type {
  CreatePurchasePaymentInput,
  EvidenceFileInput,
  ListPurchasePaymentsFilters,
  ListPurchasePaymentsResult,
  PurchasePaymentAllocationInput,
  PurchasePaymentDetail,
  PurchasePaymentSummary,
  ReversePurchasePaymentInput,
} from './purchase-payments.types.js';

/**
 * Purchase payment business logic. See business-blueprint sections 2.16-2.17
 * and docs/implementation-plan.md Phase 7D.
 *
 * Lifecycle: `PENDING` (created by any of the three roles, never affects the
 * supplier balance) → `APPROVED` (Admin/Super Admin only, reduces the
 * balance) → `REVERSED` (Admin/Super Admin only, written reason required,
 * restores the balance). Never permanently deleted.
 *
 * Allocations are traceability only (technical-blueprint section 4.10) — the
 * supplier balance always uses the payment's own `amount`/`status`, never
 * the allocation breakdown.
 */

const AUDIT_MODULE = 'purchase-payments';
const CACHE_MODULE = 'purchase-payments';
const LIST_TTL_SECONDS = 300;
const EVIDENCE_CATEGORY = 'purchase-payment-evidence';

export async function listPurchasePayments(
  filters: ListPurchasePaymentsFilters,
): Promise<ListPurchasePaymentsResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findPurchasePayments(filters);
    return { payments: rows.map(toSummary), totalRecords: total };
  });
}

export async function getPurchasePayment(id: string): Promise<PurchasePaymentDetail> {
  return toDetail(await requirePayment(id));
}

export interface EvidenceDownload {
  content: Buffer;
  mimeType: string;
  originalFileName: string;
}

/** Authenticated, permission-gated download — see `purchase-payments.routes.ts`. */
export async function getPurchasePaymentEvidence(id: string): Promise<EvidenceDownload> {
  const payment = await requirePayment(id);

  if (!payment.evidenceStoredFile) {
    throw new ResourceNotFoundError('This purchase payment has no uploaded evidence.');
  }

  const content = await getStorageProvider().get(payment.evidenceStoredFile.storageKey);

  return {
    content,
    mimeType: payment.evidenceStoredFile.mimeType,
    originalFileName: payment.evidenceStoredFile.originalFileName,
  };
}

/**
 * Creates a payment as `PENDING`. Validates the amount against the
 * supplier's current outstanding balance and every allocation against its
 * purchase's remaining unpaid amount — both re-checked, more strictly,
 * inside the approval transaction (`approvePurchasePayment`), since this
 * creation-time check is only advisory (a `PENDING` payment never reduces
 * the balance, so nothing here is a hard reservation).
 *
 * The evidence file (if any) is stored **before** the transaction — storage
 * is not a database operation and cannot participate in one, the same
 * tradeoff `documents.service.ts` accepts for generated PDFs. Unlike that
 * pipeline, Phase 7D explicitly requires cleanup: if the transaction fails,
 * the just-stored file is removed so it never becomes orphaned.
 */
export async function createPurchasePayment(
  input: CreatePurchasePaymentInput,
  evidenceFile: EvidenceFileInput | undefined,
  context: RequestContext,
): Promise<PurchasePaymentDetail> {
  const supplier = await suppliersService.getSupplier(input.supplierId);

  if (!supplier.isActive) {
    throw new BusinessRuleViolationError(
      `"${supplier.name}" is inactive and cannot receive a payment.`,
    );
  }

  const amount = new Prisma.Decimal(input.amount);

  const balance = await suppliersService.computeSupplierBalance(input.supplierId);
  const outstandingBalance = new Prisma.Decimal(balance.outstandingBalance);

  if (amount.gt(outstandingBalance)) {
    throw new BusinessRuleViolationError(
      `Payment amount (KES ${amount.toFixed(2)}) exceeds ${supplier.name}'s outstanding balance (KES ${outstandingBalance.toFixed(2)}). The MVP does not support supplier overpayments or advance payments.`,
    );
  }

  const resolvedAllocations = await resolveAllocations(input.supplierId, input.allocations, amount);

  const stored = evidenceFile
    ? await storeFile({
        content: evidenceFile.content,
        mimeType: evidenceFile.mimeType,
        category: EVIDENCE_CATEGORY,
        originalFileName: evidenceFile.originalFileName,
      })
    : undefined;

  try {
    const created = await runInTransaction(async (tx: TransactionClient) => {
      const { documentNumber } = await allocateNumberInTransaction(tx, {
        documentType: 'PURCHASE_PAYMENT',
      });

      let evidenceStoredFileId: string | null = null;

      if (stored && evidenceFile) {
        const storedFileRow = await insertStoredFile(
          {
            storageKey: stored.storageKey,
            originalFileName: evidenceFile.originalFileName,
            mimeType: evidenceFile.mimeType,
            sizeBytes: stored.sizeBytes,
            checksum: stored.checksum,
            uploadedByUserId: context.user.id,
            retentionType: 'PERMANENT',
          },
          tx,
        );
        evidenceStoredFileId = storedFileRow.id;
      }

      const payment = await insertPurchasePayment(
        {
          paymentNumber: documentNumber,
          supplierId: input.supplierId,
          amount,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference,
          paymentDate: input.paymentDate,
          evidenceStoredFileId,
          createdByUserId: context.user.id,
          allocations: resolvedAllocations.map((allocation) => ({
            purchaseId: allocation.purchaseId,
            allocatedAmount: allocation.allocatedAmount,
          })),
        },
        tx,
      );

      await recordAudit(tx, {
        ...toAuditContext(context),
        action: 'CREATE_PURCHASE_PAYMENT',
        module: AUDIT_MODULE,
        entityType: 'PurchasePayment',
        entityId: payment.id,
        documentNumber,
        updatedData: toAuditSnapshot(payment),
      });

      return payment;
    });

    await invalidateCache();

    return toDetail(await requirePayment(created.id));
  } catch (error) {
    if (stored) {
      await getStorageProvider()
        .remove(stored.storageKey)
        .catch(() => {
          // Best-effort cleanup — the original transaction error is what
          // must reach the caller, never a secondary cleanup failure.
        });
    }
    throw error;
  }
}

/**
 * Approves a `PENDING` payment. Re-validates the supplier-balance and
 * allocation checks **inside this transaction**, after locking both the
 * supplier row and the payment row, so two payments for the same supplier
 * approved at the same moment cannot both succeed when only one should.
 */
export async function approvePurchasePayment(
  id: string,
  context: RequestContext,
): Promise<PurchasePaymentDetail> {
  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const existing = await requirePaymentForUpdate(id, tx);

    if (existing.status !== 'PENDING') {
      throw new BusinessRuleViolationError('Only a pending payment can be approved.');
    }

    // Serialises every payment for this supplier — create/approve/reverse —
    // against this one, closing the race a plain re-read could still miss.
    await lockRowsForUpdate(tx, 'suppliers', 'id', existing.supplierId);

    const balance = await suppliersService.computeSupplierBalance(existing.supplierId, tx);
    const outstandingBalance = new Prisma.Decimal(balance.outstandingBalance);

    if (existing.amount.gt(outstandingBalance)) {
      throw new BusinessRuleViolationError(
        `Approving this payment (KES ${existing.amount.toFixed(2)}) would exceed the supplier's current outstanding balance (KES ${outstandingBalance.toFixed(2)}).`,
      );
    }

    for (const allocation of existing.allocations) {
      const purchase = await purchasesService.getPurchase(allocation.purchaseId);
      const totalCost = new Prisma.Decimal(purchase.totalCost);
      const alreadyApproved = await sumApprovedAllocationsForPurchase(allocation.purchaseId, tx);
      const remainingUnpaid = totalCost.sub(alreadyApproved);

      if (allocation.allocatedAmount.gt(remainingUnpaid)) {
        throw new BusinessRuleViolationError(
          `Approving this payment would allocate more than "${purchase.purchaseNumber}"'s remaining unpaid amount.`,
        );
      }
    }

    const payment = await approvePurchasePaymentRow(id, context.user.id, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'APPROVE_PURCHASE_PAYMENT',
      module: AUDIT_MODULE,
      entityType: 'PurchasePayment',
      entityId: id,
      documentNumber: existing.paymentNumber,
      previousData: { status: existing.status },
      updatedData: { status: 'APPROVED' },
    });

    return payment;
  });

  await invalidateCache();

  return toDetail(await requirePayment(updated.id));
}

/** Reverses an `APPROVED` payment. Always requires a written reason. */
export async function reversePurchasePayment(
  id: string,
  input: ReversePurchasePaymentInput,
  context: RequestContext,
): Promise<PurchasePaymentDetail> {
  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const existing = await requirePaymentForUpdate(id, tx);

    if (existing.status !== 'APPROVED') {
      throw new BusinessRuleViolationError('Only an approved payment can be reversed.');
    }

    const payment = await reversePurchasePaymentRow(id, context.user.id, input.reason, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'REVERSE_PURCHASE_PAYMENT',
      module: AUDIT_MODULE,
      entityType: 'PurchasePayment',
      entityId: id,
      documentNumber: existing.paymentNumber,
      reason: input.reason,
      previousData: { status: existing.status },
      updatedData: { status: 'REVERSED' },
    });

    return payment;
  });

  await invalidateCache();

  return toDetail(await requirePayment(updated.id));
}

// --- Helpers ----------------------------------------------------------------

interface ResolvedAllocation {
  purchaseId: string;
  allocatedAmount: Prisma.Decimal;
}

/**
 * Validates every allocation: no duplicate purchase within one payment,
 * every purchase belongs to the same supplier, a positive amount that never
 * exceeds that purchase's remaining unpaid amount, and the combined total
 * never exceeds the payment's own amount.
 */
async function resolveAllocations(
  supplierId: string,
  allocations: PurchasePaymentAllocationInput[],
  paymentAmount: Prisma.Decimal,
): Promise<ResolvedAllocation[]> {
  if (allocations.length === 0) {
    return [];
  }

  const seenPurchaseIds = new Set<string>();
  const resolved: ResolvedAllocation[] = [];
  let allocatedTotal = new Prisma.Decimal(0);

  for (const allocation of allocations) {
    if (seenPurchaseIds.has(allocation.purchaseId)) {
      throw new BusinessRuleViolationError(
        'The same purchase cannot be allocated twice in one payment.',
      );
    }
    seenPurchaseIds.add(allocation.purchaseId);

    const purchase = await purchasesService.getPurchase(allocation.purchaseId);

    if (purchase.supplierId !== supplierId) {
      throw new BusinessRuleViolationError(
        `"${purchase.purchaseNumber}" does not belong to this supplier.`,
      );
    }

    const allocatedAmount = new Prisma.Decimal(allocation.allocatedAmount);

    if (!allocatedAmount.isPositive()) {
      throw new BusinessRuleViolationError('Allocation amount must be greater than zero.');
    }

    const totalCost = new Prisma.Decimal(purchase.totalCost);
    const alreadyApproved = await sumApprovedAllocationsForPurchase(allocation.purchaseId);
    const remainingUnpaid = totalCost.sub(alreadyApproved);

    if (allocatedAmount.gt(remainingUnpaid)) {
      throw new BusinessRuleViolationError(
        `Allocation for "${purchase.purchaseNumber}" (KES ${allocatedAmount.toFixed(2)}) exceeds its remaining unpaid amount (KES ${remainingUnpaid.toFixed(2)}).`,
      );
    }

    allocatedTotal = allocatedTotal.add(allocatedAmount);
    resolved.push({ purchaseId: allocation.purchaseId, allocatedAmount });
  }

  if (allocatedTotal.gt(paymentAmount)) {
    throw new BusinessRuleViolationError('Total allocations cannot exceed the payment amount.');
  }

  return resolved;
}

async function requirePayment(id: string): Promise<PurchasePaymentDetailRow> {
  const payment = await findPurchasePaymentById(id);

  if (!payment) {
    throw new ResourceNotFoundError('That purchase payment was not found.');
  }

  return payment;
}

/** Locks the payment row before reading it fresh — for approve/reverse only. */
async function requirePaymentForUpdate(
  id: string,
  tx: TransactionClient,
): Promise<PurchasePaymentDetailRow> {
  await lockRowsForUpdate(tx, 'purchase_payments', 'id', id);
  const payment = await findPurchasePaymentById(id, tx);

  if (!payment) {
    throw new ResourceNotFoundError('That purchase payment was not found.');
  }

  return payment;
}

async function invalidateCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListPurchasePaymentsFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `sup=${filters.supplierId ?? ''}`,
    `pur=${filters.purchaseId ?? ''}`,
    `st=${filters.status ?? ''}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function sumAllocations(allocations: { allocatedAmount: Prisma.Decimal }[]): Prisma.Decimal {
  return allocations.reduce((sum, allocation) => sum.add(allocation.allocatedAmount), new Prisma.Decimal(0));
}

function toSummary(row: PurchasePaymentRow): PurchasePaymentSummary {
  return {
    id: row.id,
    paymentNumber: row.paymentNumber,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    amount: row.amount.toFixed(2),
    paymentMethod: row.paymentMethod,
    paymentReference: row.paymentReference,
    paymentDate: row.paymentDate.toISOString(),
    status: row.status,
    hasEvidence: row.evidenceStoredFileId !== null,
    allocatedTotal: sumAllocations(row.allocations).toFixed(2),
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: PurchasePaymentDetailRow): PurchasePaymentDetail {
  return {
    id: row.id,
    paymentNumber: row.paymentNumber,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    amount: row.amount.toFixed(2),
    paymentMethod: row.paymentMethod,
    paymentReference: row.paymentReference,
    paymentDate: row.paymentDate.toISOString(),
    status: row.status,
    hasEvidence: row.evidenceStoredFileId !== null,
    allocatedTotal: sumAllocations(row.allocations).toFixed(2),
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    allocations: row.allocations.map((allocation) => ({
      id: allocation.id,
      purchaseId: allocation.purchaseId,
      purchaseNumber: allocation.purchase.purchaseNumber,
      allocatedAmount: allocation.allocatedAmount.toFixed(2),
    })),
    approvedByUserId: row.approvedByUserId,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    reversedByUserId: row.reversedByUserId,
    reversedAt: row.reversedAt ? row.reversedAt.toISOString() : null,
    reversalReason: row.reversalReason,
  };
}

function toAuditSnapshot(row: PurchasePaymentDetailRow): Record<string, unknown> {
  return {
    paymentNumber: row.paymentNumber,
    supplierId: row.supplierId,
    amount: row.amount.toFixed(2),
    paymentMethod: row.paymentMethod,
    paymentReference: row.paymentReference,
    status: row.status,
  };
}
