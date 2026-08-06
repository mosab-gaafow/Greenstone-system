/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
      // Always force regeneration so the latest template is used, even when
      // the invoice business data has not changed since the last PDF was
      // generated. Passing `new Date()` ensures the reuse short-circuit in
      // generateOfficialDocument never triggers — every download renders fresh.
      sourceUpdatedAt: new Date(),
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

// Module-level logo cache — read once from the frontend brand assets.
let _logoSvg: string | null | undefined;
let _logoDataUri: string | null | undefined;

function loadLogo(): { dataUri: string } | null {
  if (_logoDataUri !== undefined) return _logoDataUri ? { dataUri: _logoDataUri } : null;
  try {
    // Resolve from the current module file location, not process.cwd().
    // invoices.service.ts is at: backend/src/modules/invoices/
    // Go up 4 levels to the monorepo root, then into frontend/public/brand/.
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const repoRoot = resolve(__dirname, '..', '..', '..', '..');
    const logoPath = resolve(repoRoot, 'frontend', 'public', 'brand', 'greenstone-logo-horizontal-green.svg');
    const svg = readFileSync(logoPath, 'utf-8');
    _logoSvg = svg;
    _logoDataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return { dataUri: _logoDataUri };
  } catch {
    _logoSvg = null;
    _logoDataUri = null;
    return null;
  }
}

function esc(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtMoney(amount: string): string {
  const [whole, frac] = amount.split('.');
  return whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac ? '.' + frac : '');
}

/** Maximum product rows that fit on one A4 page. */
const MAX_PRODUCT_ROWS = 18;

function buildInvoiceHtml(
  invoice: InvoicePdfRow,
  settings: { companyName: string | null; address: string | null; phone: string | null; email: string | null; paymentDetails: string | null; footerNotes: string | null },
): string {
  const c = invoice.customer;
  const o = invoice.order;

  // --- Company info ---
  const companyName = esc(settings.companyName) || 'Greenstone Construction Company Limited';
  const companyAddress = esc(settings.address) || '';
  const companyPhone = esc(settings.phone) || '';
  const companyEmail = esc(settings.email) || '';
  const paymentDetails = settings.paymentDetails || '';
  const footerNotes = settings.footerNotes || '';

  // --- Dates ---
  const issueDate = nairobiDateLong(invoice.createdAt);
  const dueDate = nairobiDateLong(invoice.dueDate);
  const generatedOn = nairobiDateLong(new Date());

  // --- Logo ---
  const logo = loadLogo();
  const logoHtml = logo
    ? `<img src="${logo.dataUri}" alt="Greenstone" class="logo-img" />`
    : '';

  // --- Payment status (only APPROVED allocations count) ---
  let approved = new Prisma.Decimal(0);
  const approvedPayments: { number: string; method: string; date: string; amount: string; status: string }[] = [];
  for (const alloc of invoice.allocations ?? []) {
    if (alloc.payment.status === 'APPROVED') {
      approved = approved.add(alloc.amount);
      approvedPayments.push({
        number: alloc.payment.paymentNumber,
        method: alloc.payment.paymentMethod,
        date: nairobiDateLong(alloc.payment.paymentDate),
        amount: alloc.amount.toFixed(2),
        status: 'APPROVED',
      });
    }
  }
  const outstanding = invoice.totalAmount.sub(approved);

  let paymentStatusLabel: string;
  let paymentStatusClass: string;
  if (invoice.status === 'VOIDED') {
    paymentStatusLabel = 'VOIDED';
    paymentStatusClass = 'badge-danger';
  } else if (approved.isZero()) {
    paymentStatusLabel = 'UNPAID';
    paymentStatusClass = 'badge-neutral';
  } else if (outstanding.isZero() || outstanding.isNegative()) {
    paymentStatusLabel = 'FULLY PAID';
    paymentStatusClass = 'badge-success';
  } else {
    paymentStatusLabel = 'PARTIALLY PAID';
    paymentStatusClass = 'badge-warning';
  }

  const invoiceStatusLabel = invoice.status === 'VOIDED' ? 'VOIDED' : 'ISSUED';
  const invoiceStatusClass = invoice.status === 'VOIDED' ? 'badge-danger' : 'badge-info';

  // --- Invoiced by ---
  const invoicedByName = invoice.createdByUser?.name ? esc(invoice.createdByUser.name) : '';
  const invoicedByRole = invoice.createdByUser?.role ? esc(invoice.createdByUser.role.replace(/_/g, ' ')) : '';

  // --- Overflow check ---
  if (invoice.items.length > MAX_PRODUCT_ROWS) {
    const msg = `Invoice ${invoice.invoiceNumber} has ${invoice.items.length} product rows — the one-page template supports up to ${MAX_PRODUCT_ROWS} rows. Reduce the number of items or split the invoice.`;
    throw new Error(msg);
  }

  // --- Items ---
  const itemsRows = invoice.items.map((item, i) =>
    `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">
      <td class="num dim">${i + 1}</td>
      <td>${esc(item.productName)}</td>
      <td class="num">${item.quantity}</td>
      <td class="num">${fmtMoney(item.unitPrice.toFixed(2))}</td>
      <td class="num">${fmtMoney(item.lineTotal.toFixed(2))}</td>
    </tr>`,
  ).join('');

  // --- Payment history ---
  const paymentHistoryRows = approvedPayments.map((p) =>
    `<tr><td>${p.date}</td><td>${esc(p.number)}</td><td>${esc(p.method)}</td><td class="num">KES ${fmtMoney(p.amount)}</td></tr>`,
  ).join('');

  // --- Payment info ---
  let paymentSection: string;
  if (paymentDetails) {
    paymentSection = `<pre class="payment-text">${esc(paymentDetails)}</pre>`;
  } else {
    paymentSection = `<div class="payment-info-grid">
      <div><span class="muted">M-Pesa Paybill / Till:</span> <span class="dim">Not configured</span></div>
      <div><span class="muted">Account Number:</span> ${esc(invoice.invoiceNumber)}</div>
    </div>`;
  }

  // --- Delivery lines ---
  const deliveryParts: string[] = [];
  if (o.addressLabel) deliveryParts.push(esc(o.addressLabel));
  if (o.addressLine) deliveryParts.push(esc(o.addressLine));
  if (o.addressDirections) deliveryParts.push(`<span class="dim">${esc(o.addressDirections)}</span>`);

  // --- Company contact lines for header ---
  const headerLines: string[] = [];
  if (companyAddress) headerLines.push(companyAddress);
  const contactParts: string[] = [];
  if (companyPhone) contactParts.push(companyPhone);
  if (companyEmail) contactParts.push(companyEmail);
  if (contactParts.length > 0) headerLines.push(contactParts.join(' &ensp;|&ensp; '));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${esc(invoice.invoiceNumber)}</title>
<style>
  @page { margin: 12mm 14mm; size: A4; }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 9pt;
    color: #1e293b;
    line-height: 1.45;
    max-height: 297mm;
  }

  :root {
    --green: #14532D;
    --green-light: #3F8A5A;
    --g50: #f8fafc;
    --g100: #f1f5f9;
    --g200: #e2e8f0;
    --g300: #cbd5e1;
    --g400: #94a3b8;
    --g500: #64748b;
    --g600: #475569;
    --g700: #334155;
    --g800: #1e293b;
    --red-bg: #fef2f2; --red-tx: #991b1b;
    --green-bg: #f0fdf4; --green-tx: #166534;
    --amber-bg: #fffbeb; --amber-tx: #92400e;
    --blue-bg: #eff6ff; --blue-tx: #1e40af;
    --slate-bg: #f8fafc; --slate-tx: #475569;
  }

  /* ---- Header ---- */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 3px solid var(--green);
  }
  .header-left { flex: 1; }
  .logo-img { height: 36px; width: auto; margin-bottom: 3px; }
  .company-name { font-size: 10pt; font-weight: 700; color: var(--g800); }
  .company-meta { font-size: 10pt; color: var(--g600); line-height: 1.55; margin-top: 2px; }

  .header-right { text-align: right; flex-shrink: 0; }
  .doc-title { font-size: 20pt; font-weight: 800; color: var(--green); letter-spacing: -0.5px; line-height: 1; }
  .doc-number { font-size: 10pt; font-weight: 600; color: var(--g700); margin-top: 4px; }
  .doc-number .inv-num { font-family: 'SF Mono', 'Cascadia Code', monospace; }

  /* ---- Badges ---- */
  .badge { display: inline-block; padding: 2px 9px; border-radius: 3px; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; }
  .badge-success { background: var(--green-bg); color: var(--green-tx); }
  .badge-danger { background: var(--red-bg); color: var(--red-tx); }
  .badge-warning { background: var(--amber-bg); color: var(--amber-tx); }
  .badge-info { background: var(--blue-bg); color: var(--blue-tx); }
  .badge-neutral { background: var(--slate-bg); color: var(--slate-tx); }

  /* ---- Info Cards ---- */
  .cards-row { display: flex; gap: 16px; margin-bottom: 14px; }
  .card { flex: 1; background: var(--g50); border: 1px solid var(--g200); border-radius: 5px; padding: 9px 12px; }
  .card h3 { font-size: 7pt; color: var(--g500); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px; font-weight: 700; }
  .card p { font-size: 8.5pt; margin-bottom: 2px; color: var(--g700); }
  .card .dim { color: var(--g500); }
  .card .row { display: flex; justify-content: space-between; align-items: baseline; }
  .card .row + .row { margin-top: 1px; }

  /* ---- Items Table ---- */
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 12px; page-break-inside: auto; }
  table.items thead { display: table-header-group; }
  table.items thead th {
    background: var(--green); color: #fff; text-align: left; padding: 6px 8px;
    font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
  }
  table.items tbody td { padding: 5px 8px; border-bottom: 1px solid var(--g200); font-size: 8.5pt; }
  table.items tbody tr.even { background: var(--g50); }
  table.items .num { text-align: right; font-variant-numeric: tabular-nums; }
  table.items .dim { color: var(--g400); }
  table.items tr { page-break-inside: avoid; }

  /* ---- Totals ---- */
  .totals-row { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .totals-box { background: var(--g50); border: 1.5px solid var(--green); border-radius: 5px; padding: 8px 24px; text-align: right; }
  .totals-box .total-label { font-size: 7.5pt; color: var(--g500); text-transform: uppercase; letter-spacing: 0.5px; }
  .totals-box .total-amount { font-size: 15pt; font-weight: 800; color: var(--green); }

  /* ---- Payment Summary Cards ---- */
  .pay-cards { display: flex; gap: 12px; margin-bottom: 14px; }
  .pay-card { flex: 1; background: var(--g50); border: 1px solid var(--g200); border-radius: 5px; padding: 10px 12px; text-align: center; }
  .pay-card .pc-label { font-size: 7pt; color: var(--g500); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3px; font-weight: 600; }
  .pay-card .pc-amount { font-size: 13pt; font-weight: 800; color: var(--g800); }
  .pay-card.due .pc-amount { color: var(--red-tx); }
  .pay-card.paid .pc-amount { color: var(--green-tx); }
  .pay-status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .pay-status-row .ps-label { font-size: 8pt; font-weight: 600; color: var(--g600); }

  /* ---- Section headings ---- */
  .section-title { font-size: 9pt; font-weight: 700; color: var(--green); margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1.5px solid var(--green); page-break-after: avoid; }

  /* ---- Payment History ---- */
  .pay-history { margin-bottom: 12px; }
  .pay-history table { width: 100%; border-collapse: collapse; }
  .pay-history thead th { background: var(--g100); text-align: left; padding: 4px 8px; font-size: 7pt; font-weight: 600; color: var(--g500); text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1.5px solid var(--g200); }
  .pay-history tbody td { padding: 3px 8px; font-size: 8pt; border-bottom: 1px solid var(--g200); }
  .pay-history .num { text-align: right; font-variant-numeric: tabular-nums; }
  .no-payments { font-size: 8pt; color: var(--g400); font-style: italic; padding: 6px 0; }

  /* ---- Payment Info ---- */
  .payment-info-grid { font-size: 10pt; line-height: 1.65; margin-bottom: 10px; }
  .payment-info-grid .muted { color: var(--g500); font-weight: 500; }
  .payment-text { font-size: 10pt; color: var(--g700); white-space: pre-wrap; margin-bottom: 10px; line-height: 1.55; }

  /* ---- Invoiced By ---- */
  .invoiced-by { margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--g200); display: flex; justify-content: space-between; align-items: flex-end; }
  .ib-block { }
  .ib-label { font-size: 7pt; color: var(--g500); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px; }
  .ib-name { font-size: 9pt; font-weight: 600; color: var(--g700); }
  .ib-role { font-size: 7.5pt; color: var(--g400); text-transform: capitalize; }

  /* ---- Footer ---- */
  .pdf-footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid var(--g200); display: flex; justify-content: space-between; font-size: 6.5pt; color: var(--g400); }
  .dim { color: var(--g500); }
  .muted { color: var(--g500); }
</style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      ${logo ? '' : `<div class="company-name">${companyName}</div>`}
      <div class="company-meta">${headerLines.join('<br>')}</div>
    </div>
    <div class="header-right">
      <div class="doc-title">INVOICE</div>
      <div class="doc-number"><span class="inv-num">${esc(invoice.invoiceNumber)}</span></div>
      <div style="margin-top:4px"><span class="badge ${invoiceStatusClass}">${invoiceStatusLabel}</span></div>
    </div>
  </div>

  <!-- Info Cards -->
  <div class="cards-row">
    <div class="card">
      <h3>Invoice Details</h3>
      <div class="row"><span class="dim">Invoice</span> <span class="inv-num" style="font-size:8pt">${esc(invoice.invoiceNumber)}</span></div>
      <div class="row"><span class="dim">Order</span> ${esc(o.orderNumber)}</div>
      <div class="row"><span class="dim">Issue Date</span> ${issueDate}</div>
      <div class="row"><span class="dim">Due Date</span> ${dueDate}</div>
      <div class="row"><span class="dim">Invoice Status</span> <span class="badge ${invoiceStatusClass}">${invoiceStatusLabel}</span></div>
    </div>
    <div class="card">
      <h3>Bill To</h3>
      <p style="font-weight:600">${esc(c.name)}</p>
      ${c.phone ? `<p>${esc(c.phone)}</p>` : ''}
    </div>
    <div class="card">
      <h3>Deliver To</h3>
      ${deliveryParts.length > 0 ? deliveryParts.map(p => `<p>${p}</p>`).join('\n      ') : '<p class="dim">Same as billing</p>'}
    </div>
  </div>

  <!-- Items Table -->
  <table class="items">
    <thead>
      <tr><th style="width:24px">#</th><th>Description</th><th class="num" style="width:48px">Qty</th><th class="num" style="width:90px">Unit Price</th><th class="num" style="width:100px">Amount</th></tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <!-- Totals -->
  <div class="totals-row">
    <div class="totals-box">
      <div class="total-label">Total (KES)</div>
      <div class="total-amount">KES ${fmtMoney(invoice.totalAmount.toFixed(2))}</div>
    </div>
  </div>

  <!-- Payment Summary -->
  <div class="pay-status-row">
    <span class="ps-label">Payment Status:</span>
    <span class="badge ${paymentStatusClass}">${paymentStatusLabel}</span>
  </div>
  <div class="pay-cards">
    <div class="pay-card">
      <div class="pc-label">Invoice Total</div>
      <div class="pc-amount">KES ${fmtMoney(invoice.totalAmount.toFixed(2))}</div>
    </div>
    <div class="pay-card paid">
      <div class="pc-label">Amount Paid</div>
      <div class="pc-amount">KES ${fmtMoney(approved.toFixed(2))}</div>
    </div>
    <div class="pay-card due">
      <div class="pc-label">Balance Due</div>
      <div class="pc-amount">KES ${fmtMoney(outstanding.toFixed(2))}</div>
    </div>
  </div>

  <!-- Payment History -->
  <div class="section-title">Payment History</div>
  ${approvedPayments.length > 0 ? `
  <div class="pay-history">
    <table>
      <thead><tr><th>Date</th><th>Payment #</th><th>Method</th><th class="num">Amount</th></tr></thead>
      <tbody>${paymentHistoryRows}</tbody>
    </table>
  </div>` : '<div class="no-payments">No approved payments yet.</div>'}

  <!-- Payment Information -->
  <div class="section-title">Payment Information</div>
  ${paymentSection}

  <!-- Invoiced By -->
  <div class="invoiced-by">
    <div class="ib-block">
      <div class="ib-label">Invoiced by</div>
      <div class="ib-name">${invoicedByName || '&mdash;'}</div>
      ${invoicedByRole ? `<div class="ib-role">${invoicedByRole}</div>` : ''}
    </div>
    <div style="text-align:right;">
      ${footerNotes ? `<div style="font-size:7pt;color:var(--g400);max-width:280px">${esc(footerNotes)}</div>` : ''}
    </div>
  </div>

  <!-- Footer -->
  <div class="pdf-footer">
    <span>PDF generated on ${generatedOn}</span>
    <span>Page 1 of 1</span>
  </div>
</body>
</html>`;
}

