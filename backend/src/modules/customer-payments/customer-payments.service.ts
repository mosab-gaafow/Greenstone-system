/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '../../generated/prisma/client.js';
import { findPayments, findPaymentById, insertPayment, approvePayment, reversePayment, insertAllocations, insertReceipt, voidReceipt, type PaymentDetailRow, type PaymentRow } from './customer-payments.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { lockRowsForUpdate, runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, InvalidDocumentStatusError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import * as customersService from '../customers/customers.service.js';
import { storeFile } from '../../shared/storage/storage.service.js';
import { insertStoredFile } from '../../shared/storage/storage.repository.js';
import { getStorageProvider } from '../../shared/storage/storage.service.js';
import { updatePaymentEvidence } from './customer-payments.repository.js';
import type { ApprovePaymentInput, ApprovePaymentResult, CreatePaymentInput, EvidenceFileInput, ListPaymentsFilters, ListPaymentsResult, PaymentDetail, PaymentSummary, ReversePaymentInput, ReversePaymentResult } from './customer-payments.types.js';

const AUDIT_MODULE = 'customer-payments';
const CACHE_MODULE = 'customer-payments';
const LIST_TTL = 300;

export async function listPayments(f: ListPaymentsFilters): Promise<ListPaymentsResult> {
  const key = buildCacheKey({ module: CACHE_MODULE, resource: 'list', identifier: `p=${f.page}&s=${f.pageSize}&q=${f.search ?? ''}&st=${f.status ?? ''}&c=${f.customerId ?? ''}` });
  return cache.getOrSet(key, LIST_TTL, async () => { const { rows, total } = await findPayments(f); return { payments: rows.map(toSummary), totalRecords: total }; });
}

export async function getPayment(id: string): Promise<PaymentDetail> { return toDetail(await requirePayment(id)); }

export async function createPayment(input: CreatePaymentInput, context: RequestContext): Promise<PaymentDetail> {
  const cust = await customersService.getCustomer(input.customerId);
  if (!cust.isActive) throw new BusinessRuleViolationError(`Customer "${cust.name}" is inactive.`);
  const amount = new Prisma.Decimal(input.amount);
  if (!amount.isPositive()) throw new BusinessRuleViolationError('Amount must be greater than zero.');
  if (input.paymentMethod !== 'CASH' && (!input.paymentReference || !input.paymentReference.trim())) throw new BusinessRuleViolationError('Payment reference is required for non-cash payments.');

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const { documentNumber } = await allocateNumberInTransaction(tx, { documentType: 'CUSTOMER_PAYMENT' });
    const payment = await insertPayment(tx, { paymentNumber: documentNumber, customerId: input.customerId, amount, paymentMethod: input.paymentMethod, paymentReference: input.paymentReference?.trim() || null, paymentDate: input.paymentDate, recordedByUserId: context.user.id });
    // Persist allocations immediately so they appear in finance summaries while PENDING
    if (input.allocations.length > 0) {
      await insertAllocations(tx, payment.id, (input.allocations ?? []).map(a => ({ invoiceId: a.invoiceId, amount: new Prisma.Decimal(a.amount).toFixed(2) })));
    }
    await recordAudit(tx, { ...toAuditContext(context), action: 'CREATE_CUSTOMER_PAYMENT', module: AUDIT_MODULE, entityType: 'CustomerPayment', entityId: payment.id, documentNumber, updatedData: { amount: amount.toFixed(2), paymentMethod: input.paymentMethod, allocations: (input.allocations ?? []).map(a => ({ invoiceId: a.invoiceId, amount: a.amount })) } });
    return payment;
  });
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
  return toDetail(await requirePayment(created.id));
}

export async function approve(id: string, input: ApprovePaymentInput, context: RequestContext): Promise<ApprovePaymentResult> {
  const payment = await requirePayment(id);
  if (payment.status !== 'PENDING') throw new InvalidDocumentStatusError('Only PENDING payments can be approved.');

  const result = await runInTransaction(async (tx: TransactionClient) => {
    const locked = await tx.customerPayment.findUnique({ where: { id } });
    if (!locked || locked.status !== 'PENDING') throw new InvalidDocumentStatusError('Payment is no longer PENDING.');

    // Load existing allocations (persisted at creation time)
    let allocs = await tx.customerPaymentAllocation.findMany({ where: { paymentId: id } });
    if (allocs.length === 0) {
      // Backward-compatible: create if none exist yet
      const totalAllocated = (input.allocations ?? []).reduce((s, a) => s.add(new Prisma.Decimal(a.amount)), new Prisma.Decimal(0));
      if (!totalAllocated.equals(payment.amount)) throw new BusinessRuleViolationError('Allocations must equal the full payment amount.');
      await insertAllocations(tx, id, (input.allocations ?? []).map(a => ({ invoiceId: a.invoiceId, amount: new Prisma.Decimal(a.amount).toFixed(2) })));
      allocs = await tx.customerPaymentAllocation.findMany({ where: { paymentId: id } });
    }

    // Verify allocations sum matches payment amount
    const sumAllocs = allocs.reduce((s, a) => s.add(a.amount), new Prisma.Decimal(0));
    if (!sumAllocs.equals(payment.amount)) throw new BusinessRuleViolationError('Allocations must equal the full payment amount.');

    // Lock and validate each invoice; check outstanding balances
    const invoiceIds = [...new Set(allocs.map(a => a.invoiceId))].sort();
    for (const invoiceId of invoiceIds) {
      await lockRowsForUpdate(tx, 'invoices', 'id', invoiceId);
    }

    for (const invoiceId of invoiceIds) {
      const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!inv) throw new ResourceNotFoundError(`Invoice ${invoiceId} not found.`);
      if (inv.customerId !== payment.customerId) throw new BusinessRuleViolationError('Allocations must belong to the same customer.');
      if (inv.status !== 'ISSUED') throw new BusinessRuleViolationError(`Invoice ${inv.invoiceNumber} is not ISSUED.`);

      const alreadyApproved = await tx.customerPaymentAllocation.aggregate({
        where: { invoiceId, payment: { status: 'APPROVED', id: { not: id } } },
        _sum: { amount: true },
      });
      const alreadyPaid = alreadyApproved._sum.amount ?? new Prisma.Decimal(0);

      const thisPayment = allocs.filter(a => a.invoiceId === invoiceId)
        .reduce((s, a) => s.add(a.amount), new Prisma.Decimal(0));

      const outstanding = inv.totalAmount.sub(alreadyPaid);
      const remaining = outstanding.sub(thisPayment);

      if (remaining.isNegative()) {
        throw new BusinessRuleViolationError(
          `Allocation of KES ${thisPayment.toFixed(2)} to invoice ${inv.invoiceNumber} ` +
          `exceeds the outstanding balance of KES ${outstanding.toFixed(2)}. ` +
          `(Already approved: KES ${alreadyPaid.toFixed(2)} of KES ${inv.totalAmount.toFixed(2)})`,
        );
      }
    }

    const approved = await approvePayment(tx, id, { approvedByUserId: context.user.id, approvedAt: new Date() });
    if (!approved) throw new InvalidDocumentStatusError('Payment could not be approved.');

    // Auto-create receipt
    const { documentNumber: rcpNum } = await allocateNumberInTransaction(tx, { documentType: 'RECEIPT' });
    const rcp = await insertReceipt(tx, { receiptNumber: rcpNum, paymentId: id, customerId: payment.customerId, amount: payment.amount, customerBalanceAfterPayment: new Prisma.Decimal(0), issuedByUserId: context.user.id, issuedAt: new Date() });

    await recordAudit(tx, { ...toAuditContext(context), action: 'APPROVE_CUSTOMER_PAYMENT', module: AUDIT_MODULE, entityType: 'CustomerPayment', entityId: id, documentNumber: payment.paymentNumber, updatedData: { status: 'APPROVED', allocations: (input.allocations ?? []).map(a => ({ invoiceId: a.invoiceId, amount: a.amount })) } });
    await recordAudit(tx, { ...toAuditContext(context), action: 'ISSUE_RECEIPT', module: 'receipts', entityType: 'Receipt', entityId: rcp.id, documentNumber: rcpNum, updatedData: { paymentId: id, amount: payment.amount.toFixed(2) } });

    return { id, paymentNumber: payment.paymentNumber, receiptId: rcp.id, receiptNumber: rcpNum };
  });

  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
  await cache.delByPrefix(buildCacheKeyPrefix('customers'));
  return { ...result, status: 'APPROVED' };
}

export async function reverse(id: string, input: ReversePaymentInput, context: RequestContext): Promise<ReversePaymentResult> {
  const payment = await requirePayment(id);
  if (payment.status !== 'APPROVED') throw new InvalidDocumentStatusError('Only APPROVED payments can be reversed.');
  const reason = input.reason.trim();

  await runInTransaction(async (tx: TransactionClient) => {
    const reversed = await reversePayment(tx, id, { reversedByUserId: context.user.id, reversedAt: new Date(), reversalReason: reason });
    if (!reversed) throw new InvalidDocumentStatusError('Payment could not be reversed.');
    await voidReceipt(tx, id);
    await recordAudit(tx, { ...toAuditContext(context), action: 'REVERSE_CUSTOMER_PAYMENT', module: AUDIT_MODULE, entityType: 'CustomerPayment', entityId: id, documentNumber: payment.paymentNumber, reason, previousData: { status: 'APPROVED' }, updatedData: { status: 'REVERSED', reversalReason: reason } });
  });

  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
  await cache.delByPrefix(buildCacheKeyPrefix('customers'));
  return { id, paymentNumber: payment.paymentNumber, status: 'REVERSED' };
}

// Helpers
async function requirePayment(id: string): Promise<PaymentDetailRow> { const p = await findPaymentById(id); if (!p) throw new ResourceNotFoundError('Payment not found.'); return p; }
function toSummary(r: PaymentRow): PaymentSummary { return { id: r.id, paymentNumber: r.paymentNumber, customerId: r.customerId, customerName: r.customer.name, amount: r.amount.toFixed(2), paymentMethod: r.paymentMethod, status: r.status, paymentDate: r.paymentDate.toISOString(), createdAt: r.createdAt.toISOString() }; }
 
function toDetail(r: PaymentDetailRow): PaymentDetail {
  return {
    ...toSummary(r as unknown as PaymentRow),
    paymentReference: r.paymentReference as string | null,
    approvedByUserId: r.approvedByUserId as string | null,
    approvedAt: (r.approvedAt as Date | null)?.toISOString() ?? null,
    reversedByUserId: r.reversedByUserId as string | null,
    reversedAt: (r.reversedAt as Date | null)?.toISOString() ?? null,
    reversalReason: r.reversalReason as string | null,
    recordedByUserId: r.recordedByUserId as string | null,
    allocations: ((r.allocations ?? []) as any[]).map((a: any) => ({ id: a.id as string, invoiceId: a.invoiceId as string, invoiceNumber: (a.invoice as any).invoiceNumber as string, amount: (a.amount as any).toFixed(2) })),
    receiptId: (r.receipt as any)?.id ?? null,
    receiptNumber: (r.receipt as any)?.receiptNumber ?? null,
    evidence: (r as any).evidenceStoredFile ? {
      id: (r as any).evidenceStoredFile.id,
      originalFileName: (r as any).evidenceStoredFile.originalFileName,
      mimeType: (r as any).evidenceStoredFile.mimeType,
      sizeBytes: (r as any).evidenceStoredFile.sizeBytes,
      uploadedAt: (r as any).evidenceStoredFile.createdAt.toISOString(),
    } : null,
  };
}

// --- Evidence ---

const EVIDENCE_CATEGORY = 'customer-payment-evidence';

export async function uploadPaymentEvidence(id: string, file: EvidenceFileInput, context: RequestContext): Promise<PaymentDetail> {
  const payment = await requirePayment(id);

  // Store the file before the transaction (storage is not a DB operation).
  const stored = await storeFile({ content: file.content, mimeType: file.mimeType, category: EVIDENCE_CATEGORY, originalFileName: file.originalFileName });

  await runInTransaction(async (tx: TransactionClient) => {
    const storedFile = await insertStoredFile({
      storageKey: stored.storageKey, originalFileName: file.originalFileName,
      mimeType: file.mimeType, sizeBytes: stored.sizeBytes,
      checksum: stored.checksum, uploadedByUserId: context.user.id,
      retentionType: 'PERMANENT',
    }, tx);

    // Clear old evidence if it exists (cleanup handled by caller since old file is already orphaned externally)
    await updatePaymentEvidence(tx, id, storedFile.id);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: payment.evidenceStoredFileId ? 'REPLACE_PAYMENT_EVIDENCE' : 'UPLOAD_PAYMENT_EVIDENCE',
      module: AUDIT_MODULE, entityType: 'CustomerPayment', entityId: id,
      documentNumber: payment.paymentNumber,
      previousData: payment.evidenceStoredFileId ? { evidenceStoredFileId: payment.evidenceStoredFileId } : undefined,
      updatedData: { evidenceStoredFileId: storedFile.id, fileName: file.originalFileName, sizeBytes: stored.sizeBytes },
    });
  });

  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
  return getPayment(id);
}

export async function downloadPaymentEvidence(
  id: string,
): Promise<{ content: Buffer; mimeType: string; originalFileName: string; sizeBytes: number }> {
  const payment = await requirePayment(id);
  const evidence = (payment as any).evidenceStoredFile as { storageKey: string; mimeType: string; originalFileName: string; sizeBytes: number } | null;
  if (!evidence) throw new ResourceNotFoundError('This payment has no uploaded evidence.');
  let content: Buffer;
  try {
    content = await getStorageProvider().get(evidence.storageKey);
  } catch {
    throw new ResourceNotFoundError('The evidence file could not be read. It may have been removed from storage.');
  }
  return { content, mimeType: evidence.mimeType, originalFileName: evidence.originalFileName, sizeBytes: evidence.sizeBytes };
}
