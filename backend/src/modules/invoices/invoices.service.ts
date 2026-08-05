import { Prisma } from '../../generated/prisma/client.js';
import { getNairobiToday } from '../../shared/utils/nairobi.js';
import { findInvoices, findInvoiceById, insertInvoice, voidInvoice, type InvoiceDetailRow, type InvoiceRow } from './invoices.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, InvalidDocumentStatusError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import * as ordersService from '../orders/orders.service.js';
import type { CreateInvoiceInput, InvoiceDetail, InvoiceDetailWithFinance, InvoiceFinanceSummary, InvoiceSummary, ListInvoicesFilters, ListInvoicesResult, VoidInvoiceInput } from './invoices.types.js';

const AUDIT_MODULE = 'invoices';
const CACHE_MODULE = 'invoices';
const LIST_TTL_SECONDS = 300;

export async function listInvoices(filters: ListInvoicesFilters): Promise<ListInvoicesResult> {
  const key = buildCacheKey({ module: CACHE_MODULE, resource: 'list', identifier: buildListIdentifier(filters) });
  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findInvoices(filters);
    return { invoices: rows.map(toSummary), totalRecords: total };
  });
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  return toDetail(await requireInvoice(id));
}

export async function getInvoiceWithFinance(id: string): Promise<InvoiceDetailWithFinance> {
  const invoice = await requireInvoice(id);
  const finance = await computeInvoiceFinance(invoice);
  return { ...toDetail(invoice), finance };
}

async function computeInvoiceFinance(row: InvoiceDetailRow): Promise<InvoiceFinanceSummary> {
  const allocations = row.allocations ?? [];
  let approved = new Prisma.Decimal(0);
  let pending = new Prisma.Decimal(0);
  let reversed = new Prisma.Decimal(0);
  const payments: InvoiceFinanceSummary['payments'] = [];

  for (const alloc of allocations) {
    const p = (alloc as any).payment as any;
    if (!p) continue;
    const amt = (alloc as any).amount as Prisma.Decimal;
    const status = p.status as string;
    if (status === 'APPROVED') approved = approved.add(amt);
    else if (status === 'PENDING') pending = pending.add(amt);
    else if (status === 'REVERSED') reversed = reversed.add(amt);
    payments.push({ paymentId: p.id, paymentNumber: p.paymentNumber, amount: amt.toFixed(2), status, paymentDate: (p.paymentDate as Date).toISOString() });
  }

  const total = row.totalAmount;
  const outstanding = total.sub(approved);
  let paymentStatus: InvoiceFinanceSummary['paymentStatus'];
  if (approved.isZero()) paymentStatus = 'UNPAID';
  else if (outstanding.isZero() || outstanding.isNegative()) paymentStatus = 'FULLY_PAID';
  else paymentStatus = 'PARTIALLY_PAID';

  return { invoiceTotal: total.toFixed(2), approvedAmount: approved.toFixed(2), outstandingAmount: outstanding.toFixed(2), pendingAmount: pending.toFixed(2), reversedAmount: reversed.toFixed(2), paymentStatus, payments };
}

export async function createInvoice(input: CreateInvoiceInput, context: RequestContext): Promise<InvoiceDetail> {
  const order = await ordersService.getOrder(input.orderId);
  if (order.status === 'CANCELLED') throw new BusinessRuleViolationError('Cannot create an invoice for a cancelled order.');

  // Validate dueDate not before today (Nairobi)
  if (input.dueDate.toISOString().split('T')[0]! < getNairobiToday()) {
    throw new BusinessRuleViolationError('Due date cannot be in the past.');
  }


  // Compute items from order
  const items = order.items.map((oi) => ({
    orderItemId: oi.id,
    productId: oi.productId,
    productName: oi.productName,
    quantity: oi.quantity,
    unitPrice: oi.agreedUnitPrice,
    lineTotal: new Prisma.Decimal(oi.agreedUnitPrice).mul(oi.quantity).toFixed(2),
  }));
  const totalAmount = items.reduce((s, i) => s.add(new Prisma.Decimal(i.lineTotal)), new Prisma.Decimal(0));

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const { documentNumber } = await allocateNumberInTransaction(tx, { documentType: 'INVOICE' });
    const invoice = await insertInvoice(tx, { invoiceNumber: documentNumber, orderId: input.orderId, customerId: order.customerId, totalAmount, dueDate: input.dueDate, createdByUserId: context.user.id, items });
    await recordAudit(tx, { ...toAuditContext(context), action: 'CREATE_INVOICE', module: AUDIT_MODULE, entityType: 'Invoice', entityId: invoice.id, documentNumber, updatedData: { invoiceNumber: documentNumber, orderId: input.orderId, customerId: order.customerId, totalAmount: totalAmount.toFixed(2), dueDate: input.dueDate.toISOString(), itemCount: items.length } });
    return invoice;
  });

  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
  await cache.delByPrefix(buildCacheKeyPrefix('customers'));
  const result = toDetail(created);
  return result;
}

export async function voidInvoiceAction(id: string, input: VoidInvoiceInput, context: RequestContext): Promise<InvoiceDetail> {
  const existing = await requireInvoice(id);
  if (existing.status !== 'ISSUED') throw new InvalidDocumentStatusError('Only ISSUED invoices can be voided.');

  const reason = input.reason.trim();
  const now = new Date();

  await runInTransaction(async (tx: TransactionClient) => {
    const result = await voidInvoice(tx, id, { voidedAt: now, voidedByUserId: context.user.id, voidReason: reason });
    if (!result) throw new InvalidDocumentStatusError('Invoice could not be voided — it may no longer be ISSUED.');
    await recordAudit(tx, { ...toAuditContext(context), action: 'VOID_INVOICE', module: AUDIT_MODULE, entityType: 'Invoice', entityId: id, documentNumber: existing.invoiceNumber, reason, previousData: { status: 'ISSUED' }, updatedData: { status: 'VOIDED', voidReason: reason } });
  });

  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
  await cache.delByPrefix(buildCacheKeyPrefix('customers'));
  return getInvoice(id);
}

// --- Helpers ---

async function requireInvoice(id: string): Promise<InvoiceDetailRow> {
  const invoice = await findInvoiceById(id);
  if (!invoice) throw new ResourceNotFoundError('That invoice was not found.');
  return invoice;
}


function buildListIdentifier(f: ListInvoicesFilters): string {
  return [`p=${f.page}`, `s=${f.pageSize}`, `q=${f.search ?? ''}`, `st=${f.status ?? ''}`, `c=${f.customerId ?? ''}`, `o=${f.sortBy}.${f.sortDirection}`].join('&');
}

function toSummary(row: InvoiceRow): InvoiceSummary {
  return { id: row.id, invoiceNumber: row.invoiceNumber, orderId: row.orderId, orderNumber: row.order.orderNumber, customerId: row.customerId, customerName: row.customer.name, status: row.status, totalAmount: row.totalAmount.toFixed(2), dueDate: row.dueDate.toISOString(), itemCount: row._count.items, createdByUserId: row.createdByUserId, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function toDetail(row: InvoiceDetailRow): InvoiceDetail {
  return {
    id: row.id, invoiceNumber: row.invoiceNumber, orderId: row.orderId, orderNumber: row.order.orderNumber, customerId: row.customerId, customerName: row.customer.name, status: row.status, totalAmount: row.totalAmount.toFixed(2), dueDate: row.dueDate.toISOString(), itemCount: row.items.length, createdByUserId: row.createdByUserId, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    voidedAt: row.voidedAt?.toISOString() ?? null, voidedByUserId: row.voidedByUserId, voidReason: row.voidReason,
    items: row.items.map((i) => ({ id: i.id, orderItemId: i.orderItemId, productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice.toFixed(2), lineTotal: i.lineTotal.toFixed(2) })),
  };
}

