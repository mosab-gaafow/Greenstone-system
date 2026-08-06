import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma } from '../../generated/prisma/client.js';
import { findReceiptById, findReceipts, type ReceiptListRow, type ReceiptRow } from './receipts.repository.js';
import { generateOfficialDocument } from '../../shared/documents/documents.service.js';
import * as settingsService from '../settings/settings.service.js';
import { ResourceNotFoundError } from '../../shared/errors/app-error.js';
import type { RequestContext } from '../../shared/auth/auth-context.js';
import type { ListReceiptsFilters, ListReceiptsResult, ReceiptDetail, ReceiptSummary } from './receipts.types.js';

export async function listReceipts(filters: ListReceiptsFilters): Promise<ListReceiptsResult> {
  const { rows, total } = await findReceipts(filters);
  return { receipts: rows.map(toSummary), totalRecords: total };
}

export async function getReceipt(id: string): Promise<ReceiptDetail> {
  return toDetail(await requireReceipt(id));
}

export async function downloadReceiptPdf(
  id: string,
  context: RequestContext,
): Promise<{ content: Buffer; fileName: string; mimeType: string }> {
  const receipt = await requireReceipt(id);
  const settings = await settingsService.getSettings();

  const fileName = `Receipt_${nairobiDateFilename(receipt.issuedAt)}_${receipt.receiptNumber}.pdf`;
  const html = buildReceiptHtml(receipt, settings);

  // Always force regeneration so the latest template is used.
  const generated = await generateOfficialDocument(
    {
      documentType: 'RECEIPT',
      relatedEntityId: receipt.id,
      documentNumber: receipt.receiptNumber,
      documentTitle: `Receipt ${receipt.receiptNumber}`,
      html,
      uploadedByUserId: context.user.id,
      sourceUpdatedAt: new Date(),
    },
    context,
  );

  return { content: generated.content, fileName, mimeType: generated.mimeType };
}

// --- Helpers ---

function toSummary(row: ReceiptListRow): ReceiptSummary {
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    status: row.status,
    amount: row.amount.toFixed(2),
    issuedAt: row.issuedAt.toISOString(),
    customerName: row.customer.name,
    paymentNumber: row.payment.paymentNumber,
    paymentMethod: row.payment.paymentMethod,
    paymentReference: row.payment.paymentReference,
    invoiceNumber: row.payment.allocations[0]?.invoice.invoiceNumber ?? null,
  };
}

async function requireReceipt(id: string): Promise<ReceiptRow> {
  const receipt = await findReceiptById(id);
  if (!receipt) throw new ResourceNotFoundError('That receipt was not found.');
  return receipt;
}

function toDetail(row: ReceiptRow): ReceiptDetail {
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    status: row.status,
    amount: row.amount.toFixed(2),
    issuedAt: row.issuedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    payment: {
      id: row.payment.id,
      paymentNumber: row.payment.paymentNumber,
      status: row.payment.status,
      amount: row.payment.amount.toFixed(2),
      paymentMethod: row.payment.paymentMethod,
      paymentReference: row.payment.paymentReference,
      paymentDate: row.payment.paymentDate.toISOString(),
      approvedAt: row.payment.approvedAt?.toISOString() ?? null,
      approvedByUser: row.payment.approvedByUser,
      reversedAt: row.payment.reversedAt?.toISOString() ?? null,
      reversalReason: row.payment.reversalReason,
    },
    customer: { id: row.customer.id, name: row.customer.name, phone: row.customer.phone },
    allocations: row.payment.allocations.map((a) => ({
      id: a.id,
      invoiceId: a.invoiceId,
      invoiceNumber: a.invoice.invoiceNumber,
      orderNumber: a.invoice.order.orderNumber,
      amount: a.amount.toFixed(2),
    })),
  };
}

// --- Dates ---

const NAIROBI_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function nairobiDateFilename(d: Date): string {
  const n = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return `${String(n.getUTCDate()).padStart(2, '0')}-${NAIROBI_MONTHS[n.getUTCMonth()]}-${n.getUTCFullYear()}`;
}

function nairobiDateLong(d: Date): string {
  const full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const n = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return `${n.getUTCDate()} ${full[n.getUTCMonth()]} ${n.getUTCFullYear()}`;
}

// --- PDF template ---

let _logoSvg: string | null | undefined;
let _logoDataUri: string | null | undefined;

function loadLogo(): { dataUri: string } | null {
  if (_logoDataUri !== undefined) return _logoDataUri ? { dataUri: _logoDataUri } : null;
  try {
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

function buildReceiptHtml(
  receipt: ReceiptRow,
  settings: { companyName: string | null; address: string | null; phone: string | null; email: string | null; paymentDetails: string | null; footerNotes: string | null },
): string {
  const companyName = esc(settings.companyName) || 'Greenstone Construction Company Limited';
  const companyAddress = esc(settings.address) || '';
  const companyPhone = esc(settings.phone) || '';
  const companyEmail = esc(settings.email) || '';
  const footerNotes = settings.footerNotes || '';

  const isVoided = receipt.status === 'VOIDED' || receipt.payment.status === 'REVERSED';
  const statusLabel = isVoided ? 'VOIDED' : 'ACTIVE';
  const statusClass = isVoided ? 'badge-danger' : 'badge-success';

  const receiptDate = nairobiDateLong(receipt.issuedAt);
  const generatedOn = nairobiDateLong(new Date());

  const logo = loadLogo();
  const logoHtml = logo
    ? `<img src="${logo.dataUri}" alt="Greenstone" class="logo-img" />`
    : '';

  const headerLines: string[] = [];
  if (companyAddress) headerLines.push(companyAddress);
  const contactParts: string[] = [];
  if (companyPhone) contactParts.push(companyPhone);
  if (companyEmail) contactParts.push(companyEmail);
  if (contactParts.length > 0) headerLines.push(contactParts.join(' &ensp;|&ensp; '));

  const allocationRows = receipt.payment.allocations.map((a) =>
    `<tr><td>${esc(a.invoice.invoiceNumber)}</td><td>${esc(a.invoice.order.orderNumber)}</td><td class="num">KES ${fmtMoney(a.amount.toFixed(2))}</td></tr>`,
  ).join('');

  const totalAllocated = receipt.payment.allocations.reduce((sum, a) => sum.add(a.amount), new Prisma.Decimal(0));

  const paymentMethodLabel: Record<string, string> = { MPESA: 'M-Pesa', CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque' };
  const methodLabel = paymentMethodLabel[receipt.payment.paymentMethod] ?? receipt.payment.paymentMethod;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Receipt ${esc(receipt.receiptNumber)}</title>
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
    --g50: #f8fafc; --g100: #f1f5f6; --g200: #e2e8f0; --g300: #cbd5e1;
    --g400: #94a3b8; --g500: #64748b; --g600: #475569; --g700: #334155; --g800: #1e293b;
    --red-bg: #fef2f2; --red-tx: #991b1b;
    --green-bg: #f0fdf4; --green-tx: #166534;
    --blue-bg: #eff6ff; --blue-tx: #1e40af;
    --slate-bg: #f8fafc; --slate-tx: #475569;
  }

  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 3px solid var(--green); }
  .header-left { flex: 1; }
  .logo-img { height: 36px; width: auto; margin-bottom: 3px; }
  .company-meta { font-size: 10pt; color: var(--g600); line-height: 1.55; margin-top: 2px; }

  .header-right { text-align: right; flex-shrink: 0; }
  .doc-title { font-size: 20pt; font-weight: 800; color: var(--green); letter-spacing: -0.5px; line-height: 1; }
  .doc-number { font-size: 10pt; font-weight: 600; color: var(--g700); margin-top: 4px; }
  .doc-number .rcp-num { font-family: 'SF Mono', 'Cascadia Code', monospace; }

  .badge { display: inline-block; padding: 2px 9px; border-radius: 3px; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; }
  .badge-success { background: var(--green-bg); color: var(--green-tx); }
  .badge-danger { background: var(--red-bg); color: var(--red-tx); }
  .badge-info { background: var(--blue-bg); color: var(--blue-tx); }

  .cards-row { display: flex; gap: 16px; margin-bottom: 14px; }
  .card { flex: 1; background: var(--g50); border: 1px solid var(--g200); border-radius: 5px; padding: 9px 12px; }
  .card h3 { font-size: 7pt; color: var(--g500); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px; font-weight: 700; }
  .card p { font-size: 8.5pt; margin-bottom: 2px; color: var(--g700); }
  .card .dim { color: var(--g500); }
  .card .row { display: flex; justify-content: space-between; align-items: baseline; }
  .card .row + .row { margin-top: 1px; }

  .section-title { font-size: 9pt; font-weight: 700; color: var(--green); margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1.5px solid var(--green); }

  table.data { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.data thead th { background: var(--green); color: #fff; text-align: left; padding: 6px 8px; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  table.data tbody td { padding: 5px 8px; border-bottom: 1px solid var(--g200); font-size: 8.5pt; }
  table.data tbody tr.even { background: var(--g50); }
  table.data .num { text-align: right; font-variant-numeric: tabular-nums; }

  .totals-row { display: flex; justify-content: flex-end; margin-bottom: 14px; }
  .totals-box { background: var(--g50); border: 1.5px solid var(--green); border-radius: 5px; padding: 8px 24px; text-align: right; }
  .totals-box .total-label { font-size: 7.5pt; color: var(--g500); text-transform: uppercase; letter-spacing: 0.5px; }
  .totals-box .total-amount { font-size: 15pt; font-weight: 800; color: var(--green); }

  .voided-notice { background: var(--red-bg); border: 1px solid #fecaca; border-radius: 4px; padding: 8px 12px; margin-bottom: 14px; font-size: 9pt; color: var(--red-tx); font-weight: 600; }

  .invoiced-by { margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--g200); display: flex; justify-content: space-between; align-items: flex-end; }
  .ib-label { font-size: 7pt; color: var(--g500); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px; }
  .ib-name { font-size: 9pt; font-weight: 600; color: var(--g700); }

  .pdf-footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid var(--g200); display: flex; justify-content: space-between; font-size: 6.5pt; color: var(--g400); }
  .dim { color: var(--g500); }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      ${logo ? '' : `<div style="font-size:10pt;font-weight:700;color:var(--g800)">${companyName}</div>`}
      <div class="company-meta">${headerLines.join('<br>')}</div>
    </div>
    <div class="header-right">
      <div class="doc-title">RECEIPT</div>
      <div class="doc-number"><span class="rcp-num">${esc(receipt.receiptNumber)}</span></div>
      <div style="margin-top:4px"><span class="badge ${statusClass}">${statusLabel}</span></div>
    </div>
  </div>

  ${isVoided ? '<div class="voided-notice">This receipt has been voided. The payment was reversed' + (receipt.payment.reversalReason ? ': ' + esc(receipt.payment.reversalReason) : '.') + '</div>' : ''}

  <div class="cards-row">
    <div class="card">
      <h3>Receipt Details</h3>
      <div class="row"><span class="dim">Receipt</span> <span class="rcp-num" style="font-size:8pt">${esc(receipt.receiptNumber)}</span></div>
      <div class="row"><span class="dim">Date</span> ${receiptDate}</div>
      <div class="row"><span class="dim">Status</span> <span class="badge ${statusClass}">${statusLabel}</span></div>
    </div>
    <div class="card">
      <h3>Received From</h3>
      <p style="font-weight:600">${esc(receipt.customer.name)}</p>
      ${receipt.customer.phone ? `<p>${esc(receipt.customer.phone)}</p>` : ''}
    </div>
    <div class="card">
      <h3>Payment</h3>
      <div class="row"><span class="dim">Payment #</span> ${esc(receipt.payment.paymentNumber)}</div>
      <div class="row"><span class="dim">Method</span> ${methodLabel}</div>
      <div class="row"><span class="dim">Amount</span> <strong>KES ${fmtMoney(receipt.payment.amount.toFixed(2))}</strong></div>
      ${receipt.payment.paymentReference ? `<div class="row"><span class="dim">Reference</span> ${esc(receipt.payment.paymentReference)}</div>` : ''}
    </div>
  </div>

  <div class="section-title">Invoice Allocations</div>
  <table class="data">
    <thead><tr><th>Invoice</th><th>Order</th><th class="num">Amount</th></tr></thead>
    <tbody>${allocationRows}</tbody>
  </table>

  <div class="totals-row">
    <div class="totals-box">
      <div class="total-label">Total Received (KES)</div>
      <div class="total-amount">KES ${fmtMoney(totalAllocated.toFixed(2))}</div>
    </div>
  </div>

  <div class="invoiced-by">
    <div>
      <div class="ib-label">Issued by</div>
      <div class="ib-name">${receipt.payment.approvedByUser?.name ? esc(receipt.payment.approvedByUser.name) : '&mdash;'}</div>
    </div>
    <div style="text-align:right;">
      ${footerNotes ? `<div style="font-size:7pt;color:var(--g400);max-width:280px">${esc(footerNotes)}</div>` : ''}
    </div>
  </div>

  <div class="pdf-footer">
    <span>PDF generated on ${generatedOn}</span>
    <span>Page 1 of 1</span>
  </div>
</body>
</html>`;
}
