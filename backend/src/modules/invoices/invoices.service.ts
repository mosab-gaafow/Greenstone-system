/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '../../generated/prisma/client.js';
import { getNairobiToday } from '../../shared/utils/nairobi.js';
import { findInvoices, findInvoiceById, findInvoiceForPdf, insertInvoice, voidInvoice, type InvoiceDetailRow, type InvoicePdfRow, type InvoiceRow } from './invoices.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, InvalidDocumentStatusError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import { generateOfficialDocument } from '../../shared/documents/documents.service.js';
import * as ordersService from '../orders/orders.service.js';
import * as settingsService from '../settings/settings.service.js';
import type { CreateInvoiceInput, InvoiceDetail, InvoiceDetailWithFinance, InvoiceFinanceSummary, InvoiceSummary, ListInvoicesFilters, ListInvoicesResult, VoidInvoiceInput } from './invoices.types.js';

const AUDIT_MODULE = 'invoices';
const CACHE_MODULE = 'invoices';
const LIST_TTL_SECONDS = 300;

export async function listInvoices(filters: ListInvoicesFilters): Promise<ListInvoicesResult> {
  const key = buildCacheKey({ module: CACHE_MODULE, resource: 'list', identifier: buildListIdentifier(filters) });
  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findInvoices(filters);
    const invoices = rows.map(toSummary);
    // Payment status filter (computed — filter post-query for correctness)
    if (filters.paymentStatus) {
      const withFinance = rows.map(r => computeInvoiceFinanceFast(r));
      const filtered = rows.filter((_, i) => withFinance[i]!.paymentStatus === filters.paymentStatus);
      return { invoices: filtered.map(toSummary), totalRecords: filtered.length };
    }
    return { invoices, totalRecords: total };
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

/** Quick payment status from list rows (has allocations with payment.status). */
function computeInvoiceFinanceFast(row: InvoiceRow): { paymentStatus: InvoiceFinanceSummary['paymentStatus'] } {
  let approved = new Prisma.Decimal(0);
  for (const alloc of (row as any).allocations ?? []) {
    if ((alloc as any).payment?.status === 'APPROVED') approved = approved.add((alloc as any).amount);
  }
  const outstanding = row.totalAmount.sub(approved);
  if (approved.isZero()) return { paymentStatus: 'UNPAID' };
  if (outstanding.isZero() || outstanding.isNegative()) return { paymentStatus: 'FULLY_PAID' };
  return { paymentStatus: 'PARTIALLY_PAID' };
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

const NAIROBI_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Format a UTC date as DD-MMM-YYYY in Africa/Nairobi. */
function nairobiDateFilename(d: Date): string {
  const n = new Date(d.getTime() + 3 * 60 * 60 * 1000); // UTC+3
  return `${String(n.getUTCDate()).padStart(2, '0')}-${NAIROBI_MONTHS[n.getUTCMonth()]}-${n.getUTCFullYear()}`;
}

/** Format a UTC date as "DD Month YYYY" in Africa/Nairobi. */
function nairobiDateLong(d: Date): string {
  const full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const n = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return `${n.getUTCDate()} ${full[n.getUTCMonth()]} ${n.getUTCFullYear()}`;
}

export async function downloadInvoicePdf(id: string, context: RequestContext): Promise<{ content: Buffer; fileName: string; mimeType: string }> {
  const invoice = await findInvoiceForPdf(id);
  if (!invoice) throw new ResourceNotFoundError('That invoice was not found.');
  const settings = await settingsService.getSettings();

  const fileName = `Invoice_${nairobiDateFilename(invoice.createdAt)}_${invoice.invoiceNumber}.pdf`;
  const html = buildInvoiceHtml(invoice, settings);

  const generated = await generateOfficialDocument(
    {
      documentType: 'INVOICE',
      relatedEntityId: invoice.id,
      documentNumber: invoice.invoiceNumber,
      documentTitle: `Invoice ${invoice.invoiceNumber}`,
      html,
      uploadedByUserId: context.user.id,
      sourceUpdatedAt: invoice.updatedAt,
    },
    context,
  );

  return {
    content: generated.content,
    fileName,
    mimeType: generated.mimeType,
  };
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
  const ps = computeInvoiceFinanceFast(row);
  return { id: row.id, invoiceNumber: row.invoiceNumber, orderId: row.orderId, orderNumber: row.order.orderNumber, customerId: row.customerId, customerName: row.customer.name, status: row.status, totalAmount: row.totalAmount.toFixed(2), dueDate: row.dueDate.toISOString(), itemCount: row._count.items, paymentStatus: ps.paymentStatus, createdByUserId: row.createdByUserId, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function toDetail(row: InvoiceDetailRow): InvoiceDetail {
  const ps = computeInvoiceFinanceFast(row as unknown as InvoiceRow);
  return {
    id: row.id, invoiceNumber: row.invoiceNumber, orderId: row.orderId, orderNumber: row.order.orderNumber, customerId: row.customerId, customerName: row.customer.name, status: row.status, totalAmount: row.totalAmount.toFixed(2), dueDate: row.dueDate.toISOString(), itemCount: row.items.length, paymentStatus: ps.paymentStatus, createdByUserId: row.createdByUserId, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    voidedAt: row.voidedAt?.toISOString() ?? null, voidedByUserId: row.voidedByUserId, voidReason: row.voidReason,
    items: row.items.map((i) => ({ id: i.id, orderItemId: i.orderItemId, productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice.toFixed(2), lineTotal: i.lineTotal.toFixed(2) })),
  };
}

// --- Invoice PDF HTML template -------------------------------------------------

function esc(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Format a decimal string with thousands separators, e.g. "20,000.00". */
function fmtMoney(amount: string): string {
  const [whole, frac] = amount.split('.');
  return whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac ? '.' + frac : '');
}

function buildInvoiceHtml(
  invoice: InvoicePdfRow,
  settings: { companyName: string | null; address: string | null; phone: string | null; email: string | null; paymentDetails: string | null; footerNotes: string | null },
): string {
  const c = invoice.customer;
  const o = invoice.order;

  // --- Company info ---
  const companyName = esc(settings.companyName) || 'Greenstone';
  const hasAddress = !!(settings.address);
  const hasPhone = !!(settings.phone);
  const hasEmail = !!(settings.email);
  const paymentDetails = settings.paymentDetails || '';
  const footerNotes = settings.footerNotes || '';

  // --- Dates ---
  const issueDate = nairobiDateLong(invoice.createdAt);
  const dueDate = nairobiDateLong(invoice.dueDate);
  const generatedOn = nairobiDateLong(new Date());

  // --- Logo (no logo field yet in Company Settings; safe fallback) ---
  const logoHtml = `<div class="logo-placeholder">${companyName}</div>`;

  // --- Payment status (only APPROVED allocations count) ---
  let approved = new Prisma.Decimal(0);
  for (const alloc of invoice.allocations ?? []) {
    if (alloc.payment.status === 'APPROVED') approved = approved.add(alloc.amount);
  }
  const outstanding = invoice.totalAmount.sub(approved);
  let paymentStatusLabel: string;
  let paymentStatusClass: string;
  if (approved.isZero()) { paymentStatusLabel = 'Unpaid'; paymentStatusClass = 'pay-unpaid'; }
  else if (outstanding.isZero() || outstanding.isNegative()) { paymentStatusLabel = 'Fully paid'; paymentStatusClass = 'pay-paid'; }
  else { paymentStatusLabel = 'Partially paid'; paymentStatusClass = 'pay-partial'; }

  // --- Payment instructions ---
  let paymentSection: string;
  if (paymentDetails) {
    paymentSection = `<pre class="payment-text">${esc(paymentDetails)}</pre>`;
  } else {
    paymentSection = `<table class="payment-table">
      <tr><td class="pay-label">M-Pesa Paybill / Till:</td><td class="pay-value">To be configured in Company Settings</td></tr>
      <tr><td class="pay-label">Account Number:</td><td class="pay-value">${esc(invoice.invoiceNumber)}</td></tr>
    </table>`;
  }

  // --- Items ---
  const itemsRows = invoice.items.map((item) =>
    `<tr>
      <td class="item-name">${esc(item.productName)}</td>
      <td class="num">${item.quantity}</td>
      <td class="num">${fmtMoney(item.unitPrice.toFixed(2))}</td>
      <td class="num">${fmtMoney(item.lineTotal.toFixed(2))}</td>
    </tr>`,
  ).join('');

  // --- Company contact lines (only show configured fields) ---
  const contactLines: string[] = [];
  if (hasAddress) contactLines.push(`<div>${esc(settings.address)}</div>`);
  const phoneEmailParts: string[] = [];
  if (hasPhone) phoneEmailParts.push(esc(settings.phone));
  if (hasEmail) phoneEmailParts.push(esc(settings.email));
  if (phoneEmailParts.length > 0) contactLines.push(`<div>${phoneEmailParts.join(' &ensp;|&ensp; ')}</div>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${esc(invoice.invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; padding: 48px 56px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 28px; }
  .logo-placeholder { font-size: 22pt; font-weight: 700; color: #2563eb; letter-spacing: -0.5px; }
  .company-details { text-align: right; font-size: 9pt; color: #555; line-height: 1.6; }
  .doc-title { font-size: 20pt; font-weight: 700; color: #2563eb; margin-bottom: 20px; letter-spacing: -0.5px; }
  .info-grid { display: flex; gap: 40px; margin-bottom: 28px; }
  .info-col { flex: 1; }
  .info-col h3 { font-size: 9pt; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .info-col p { font-size: 10pt; margin-bottom: 2px; }
  .info-col .label { color: #888; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  table.items thead th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 9pt; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #d1d5db; }
  table.items tbody td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 10pt; }
  table.items .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-left: auto; width: 280px; margin-bottom: 24px; }
  .totals table { width: 100%; border-collapse: collapse; }
  .totals td { padding: 6px 12px; font-size: 10pt; }
  .totals .total-row { border-top: 2px solid #1a1a1a; font-size: 13pt; font-weight: 700; }
  .section-title { font-size: 11pt; font-weight: 700; color: #2563eb; margin-bottom: 10px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
  .payment-table { width: 100%; max-width: 420px; border-collapse: collapse; margin-bottom: 24px; }
  .payment-table td { padding: 3px 8px; font-size: 10pt; }
  .pay-label { color: #555; width: 180px; }
  .pay-value { font-weight: 500; }
  .payment-text { font-size: 10pt; color: #333; white-space: pre-wrap; margin-bottom: 24px; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
  .status-ISSUED { background: #dbeafe; color: #1e40af; }
  .status-VOIDED { background: #fee2e2; color: #991b1b; }
  .pay-unpaid { background: #f1f5f9; color: #475569; }
  .pay-paid { background: #dcfce7; color: #166534; }
  .pay-partial { background: #fef9c3; color: #854d0e; }
  .pay-summary { margin-bottom: 24px; }
  .pay-summary table { width: 100%; max-width: 380px; border-collapse: collapse; margin-left: auto; }
  .pay-summary td { padding: 4px 12px; font-size: 10pt; }
  .pay-summary .total-row { border-top: 2px solid #1a1a1a; font-size: 12pt; font-weight: 700; }
  .generated-on { font-size: 8pt; color: #999; text-align: right; margin-top: 20px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #d1d5db; font-size: 8.5pt; color: #888; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <!-- Company header -->
  <div class="header">
    <div>${logoHtml}</div>
    <div class="company-details">
      ${contactLines.join('\n      ')}
    </div>
  </div>

  <!-- Document title -->
  <div class="doc-title">INVOICE</div>

  <!-- Invoice + Customer info -->
  <div class="info-grid">
    <div class="info-col">
      <h3>Invoice Details</h3>
      <p><span class="label">Invoice:</span> ${esc(invoice.invoiceNumber)}</p>
      <p><span class="label">Status:</span> <span class="status-badge status-${esc(invoice.status)}">${esc(invoice.status)}</span></p>
      <p><span class="label">Issue Date:</span> ${issueDate}</p>
      <p><span class="label">Due Date:</span> ${dueDate}</p>
      <p><span class="label">Order:</span> ${esc(o.orderNumber)}</p>
    </div>
    <div class="info-col">
      <h3>Bill To</h3>
      <p>${esc(c.name)}</p>
      ${c.phone ? `<p>${esc(c.phone)}</p>` : ''}
    </div>
    <div class="info-col">
      <h3>Deliver To</h3>
      ${o.addressLabel ? `<p>${esc(o.addressLabel)}</p>` : ''}
      ${o.addressLine ? `<p>${esc(o.addressLine)}</p>` : ''}
      ${o.addressDirections ? `<p>${esc(o.addressDirections)}</p>` : ''}
    </div>
  </div>

  <!-- Items -->
  <table class="items">
    <thead>
      <tr><th>Product</th><th class="num">Qty</th><th class="num">Unit Price (KES)</th><th class="num">Line Total (KES)</th></tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <table>
      <tr class="total-row"><td>Total</td><td class="num">KES ${fmtMoney(invoice.totalAmount.toFixed(2))}</td></tr>
    </table>
  </div>

  <!-- Payment summary -->
  <div class="section-title">Payment Summary</div>
  <div class="pay-summary">
    <table>
      <tr><td>Payment Status</td><td class="num"><span class="status-badge ${paymentStatusClass}">${paymentStatusLabel}</span></td></tr>
      <tr><td>Invoice Total</td><td class="num">KES ${fmtMoney(invoice.totalAmount.toFixed(2))}</td></tr>
      <tr><td>Approved</td><td class="num">KES ${fmtMoney(approved.toFixed(2))}</td></tr>
      <tr class="total-row"><td>Outstanding</td><td class="num">KES ${fmtMoney(outstanding.toFixed(2))}</td></tr>
    </table>
  </div>

  <!-- Payment instructions -->
  <div class="section-title">Payment Information</div>
  ${paymentSection}

  <!-- Generated on -->
  <div class="generated-on">PDF generated on ${generatedOn}</div>

  <!-- Footer -->
  ${footerNotes ? `<div class="footer">${esc(footerNotes)}</div>` : ''}
</body>
</html>`;
}

