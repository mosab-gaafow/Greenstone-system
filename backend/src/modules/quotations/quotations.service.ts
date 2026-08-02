import { Prisma, type QuotationStatus } from '../../generated/prisma/client.js';
import {
  findQuotationById,
  findQuotations,
  insertQuotation,
  replaceQuotationItems,
  setQuotationStatus,
  updateQuotationFields,
  type QuotationDetailRow,
  type QuotationRow,
} from './quotations.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { generateOfficialDocument } from '../../shared/documents/documents.service.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import {
  BusinessRuleViolationError,
  InvalidDocumentStatusError,
  ResourceNotFoundError,
} from '../../shared/errors/app-error.js';
import * as customersService from '../customers/customers.service.js';
import * as productsService from '../products/products.service.js';
import * as settingsService from '../settings/settings.service.js';
import type {
  CreateQuotationInput,
  ListQuotationsFilters,
  ListQuotationsResult,
  QuotationDetail,
  QuotationItemInput,
  QuotationStatusChangeInput,
  QuotationSummary,
  UpdateQuotationInput,
} from './quotations.types.js';
import type { GeneratedDocumentFile } from '../../shared/documents/documents.types.js';

/**
 * Quotation business logic. See business-blueprint sections 2.4 and 2.5, and
 * docs/implementation-plan.md Phase 5A.
 *
 * Only DRAFT quotations may be edited. Every other status change is a
 * one-way, explicit action — accept, reject, or cancel — never a plain field
 * update. Quotations are never deleted, only moved through these statuses.
 */

const AUDIT_MODULE = 'quotations';
const CACHE_MODULE = 'quotations';
const LIST_TTL_SECONDS = 300;

export async function listQuotations(filters: ListQuotationsFilters): Promise<ListQuotationsResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findQuotations(filters);
    return { quotations: rows.map(toSummary), totalRecords: total };
  });
}

export async function getQuotation(id: string): Promise<QuotationDetail> {
  return toDetail(await requireQuotation(id));
}

export async function createQuotation(
  input: CreateQuotationInput,
  context: RequestContext,
): Promise<QuotationDetail> {
  await assertCustomerActive(input.customerId);
  await assertProductsActive(input.items);

  const { items, totalAmount } = computeItems(input.items);

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const { documentNumber } = await allocateNumberInTransaction(tx, { documentType: 'QUOTATION' });

    const quotation = await insertQuotation(
      { quotationNumber: documentNumber, customerId: input.customerId, totalAmount, items },
      tx,
    );

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_QUOTATION',
      module: AUDIT_MODULE,
      entityType: 'Quotation',
      entityId: quotation.id,
      documentNumber,
      updatedData: toAuditSnapshot(quotation),
    });

    return quotation;
  });

  await invalidateQuotationCache();

  return toDetail(created);
}

export async function editQuotation(
  id: string,
  input: UpdateQuotationInput,
  context: RequestContext,
): Promise<QuotationDetail> {
  const existing = await requireDraftQuotation(id);

  if (input.customerId !== undefined) {
    await assertCustomerActive(input.customerId);
  }
  if (input.items !== undefined) {
    await assertProductsActive(input.items);
  }

  const computed = input.items !== undefined ? computeItems(input.items) : undefined;

  await runInTransaction(async (tx: TransactionClient) => {
    if (computed !== undefined) {
      await replaceQuotationItems(id, computed.items, tx);
    }

    const quotation = await updateQuotationFields(
      id,
      { customerId: input.customerId, totalAmount: computed?.totalAmount },
      tx,
    );

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_QUOTATION',
      module: AUDIT_MODULE,
      entityType: 'Quotation',
      entityId: id,
      documentNumber: existing.quotationNumber,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(quotation),
    });
  });

  await invalidateQuotationCache();

  return getQuotation(id);
}

export async function acceptQuotation(id: string, context: RequestContext): Promise<QuotationDetail> {
  return changeStatus(id, 'ACCEPTED', {}, 'ACCEPT_QUOTATION', context);
}

export async function rejectQuotation(
  id: string,
  input: QuotationStatusChangeInput,
  context: RequestContext,
): Promise<QuotationDetail> {
  return changeStatus(id, 'REJECTED', input, 'REJECT_QUOTATION', context);
}

export async function cancelQuotation(
  id: string,
  input: QuotationStatusChangeInput,
  context: RequestContext,
): Promise<QuotationDetail> {
  return changeStatus(id, 'CANCELLED', input, 'CANCEL_QUOTATION', context);
}

async function changeStatus(
  id: string,
  target: QuotationStatus,
  input: QuotationStatusChangeInput,
  action: string,
  context: RequestContext,
): Promise<QuotationDetail> {
  const existing = await requireQuotation(id);
  assertTransition(existing.status, target);

  const statusReason = input.reason?.trim() ? input.reason.trim() : null;

  await runInTransaction(async (tx: TransactionClient) => {
    const quotation = await setQuotationStatus(id, target, statusReason, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action,
      module: AUDIT_MODULE,
      entityType: 'Quotation',
      entityId: id,
      documentNumber: existing.quotationNumber,
      previousData: { status: existing.status },
      updatedData: { status: target, statusReason },
    });

    return quotation;
  });

  await invalidateQuotationCache();

  return getQuotation(id);
}

export async function downloadQuotationPdf(
  id: string,
  context: RequestContext,
): Promise<GeneratedDocumentFile> {
  const quotation = await requireQuotation(id);
  const settings = await settingsService.getSettings();
  const detail = toDetail(quotation);

  return generateOfficialDocument(
    {
      documentType: 'QUOTATION',
      relatedEntityId: id,
      documentNumber: quotation.quotationNumber,
      html: buildQuotationHtml(detail, settings),
      documentTitle: quotation.quotationNumber,
      uploadedByUserId: context.user.id,
      sourceUpdatedAt: quotation.updatedAt,
    },
    context,
  );
}

// --- Helpers ----------------------------------------------------------------

async function requireQuotation(id: string): Promise<QuotationDetailRow> {
  const quotation = await findQuotationById(id);

  if (!quotation) {
    throw new ResourceNotFoundError('That quotation was not found.');
  }

  return quotation;
}

async function requireDraftQuotation(id: string): Promise<QuotationDetailRow> {
  const quotation = await requireQuotation(id);

  if (quotation.status !== 'DRAFT') {
    throw new InvalidDocumentStatusError('Only a draft quotation can be edited.');
  }

  return quotation;
}

const ALLOWED_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
};

function assertTransition(current: QuotationStatus, target: QuotationStatus): void {
  if (!ALLOWED_TRANSITIONS[current].includes(target)) {
    throw new InvalidDocumentStatusError(
      `A quotation with status ${current} cannot be moved to ${target}.`,
    );
  }
}

async function assertCustomerActive(customerId: string): Promise<void> {
  const customer = await customersService.getCustomer(customerId);

  if (!customer.isActive) {
    throw new BusinessRuleViolationError('This customer is inactive and cannot be quoted.');
  }
}

async function assertProductsActive(items: QuotationItemInput[]): Promise<void> {
  const uniqueProductIds = [...new Set(items.map((item) => item.productId))];

  for (const productId of uniqueProductIds) {
    const product = await productsService.getProduct(productId);

    if (!product.isActive) {
      throw new BusinessRuleViolationError(`"${product.name}" is inactive and cannot be quoted.`);
    }
  }
}

/**
 * Computes every line total and the quotation total in decimal, never
 * JavaScript floating-point arithmetic. `getProduct`/`getCustomer` already
 * confirmed every id exists before this runs.
 */
function computeItems(items: QuotationItemInput[]): {
  items: (QuotationItemInput & { lineTotal: Prisma.Decimal })[];
  totalAmount: Prisma.Decimal;
} {
  let totalAmount = new Prisma.Decimal(0);

  const computed = items.map((item) => {
    const lineTotal = new Prisma.Decimal(item.agreedUnitPrice).mul(item.quantity);
    totalAmount = totalAmount.add(lineTotal);
    return { ...item, lineTotal };
  });

  return { items: computed, totalAmount };
}

async function invalidateQuotationCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListQuotationsFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `st=${filters.status ?? ''}`,
    `c=${filters.customerId ?? ''}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: QuotationRow): QuotationSummary {
  return {
    id: row.id,
    quotationNumber: row.quotationNumber,
    customerId: row.customerId,
    customerName: row.customer.name,
    status: row.status,
    totalAmount: row.totalAmount.toFixed(2),
    statusReason: row.statusReason,
    itemCount: row._count.items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: QuotationDetailRow): QuotationDetail {
  return {
    id: row.id,
    quotationNumber: row.quotationNumber,
    customerId: row.customerId,
    customerName: row.customer.name,
    status: row.status,
    totalAmount: row.totalAmount.toFixed(2),
    statusReason: row.statusReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      agreedUnitPrice: item.agreedUnitPrice.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
    })),
  };
}

function toAuditSnapshot(row: {
  quotationNumber: string;
  customerId: string;
  status: QuotationStatus;
  totalAmount: Prisma.Decimal;
  statusReason: string | null;
}): Record<string, unknown> {
  return {
    quotationNumber: row.quotationNumber,
    customerId: row.customerId,
    status: row.status,
    totalAmount: row.totalAmount.toFixed(2),
    statusReason: row.statusReason,
  };
}

/**
 * Builds the quotation PDF's HTML. Kept in the service, not a separate
 * module file — the six-file module rule leaves no room for a template
 * file, and this is presentation of the service's own data, not reusable
 * logic (Invoices/Receipts in Phase 9 will write their own).
 */
function buildQuotationHtml(
  quotation: QuotationDetail,
  settings: Awaited<ReturnType<typeof settingsService.getSettings>>,
): string {
  const rows = quotation.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td class="num">${String(item.quantity)}</td>
          <td class="num">${escapeHtml(item.agreedUnitPrice)}</td>
          <td class="num">${escapeHtml(item.lineTotal)}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(quotation.quotationNumber)}</title>
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 12px; }
  h1 { font-size: 20px; margin-bottom: 0; }
  .muted { color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
  .num { text-align: right; }
  .total-row td { font-weight: bold; border-top: 2px solid #1a1a1a; border-bottom: none; }
  .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(settings.companyName ?? 'Greenstone')}</h1>
      <div class="muted">${escapeHtml(settings.address ?? '')}</div>
      <div class="muted">${escapeHtml(settings.phone ?? '')} ${escapeHtml(settings.email ?? '')}</div>
    </div>
    <div>
      <h1>QUOTATION</h1>
      <div>${escapeHtml(quotation.quotationNumber)}</div>
    </div>
  </div>

  <div>
    <strong>Customer:</strong> ${escapeHtml(quotation.customerName)}
  </div>

  <table>
    <thead>
      <tr><th>Product</th><th class="num">Quantity</th><th class="num">Unit price</th><th class="num">Line total</th></tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row"><td colspan="3">Total</td><td class="num">KES ${escapeHtml(quotation.totalAmount)}</td></tr>
    </tbody>
  </table>

  ${settings.paymentDetails ? `<p><strong>Payment details:</strong> ${escapeHtml(settings.paymentDetails)}</p>` : ''}
  ${settings.footerNotes ? `<p class="muted">${escapeHtml(settings.footerNotes)}</p>` : ''}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
