import { Prisma } from '../../generated/prisma/client.js';
import {
  findSupplierByEmail,
  findSupplierByPhone,
  findSupplierById,
  findSupplierOpeningBalance,
  findSuppliers,
  insertSupplier,
  setSupplierActive,
  sumPurchaseTotals,
  updateSupplier,
  upsertSupplierOpeningBalance,
  type SupplierOpeningBalanceRow,
  type SupplierRow,
} from './suppliers.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import type {
  CreateSupplierInput,
  ListSuppliersFilters,
  ListSuppliersResult,
  SetSupplierOpeningBalanceInput,
  SupplierBalanceResult,
  SupplierOpeningBalanceDetail,
  SupplierSummary,
  UpdateSupplierInput,
} from './suppliers.types.js';

/**
 * Supplier business logic.
 *
 * Master record, per business-blueprint section 2.16. Suppliers are never
 * deleted, only activated and deactivated — purchases and purchase payments
 * (Phase 7C/7D) will reference them permanently.
 *
 * Opening balance and outstanding balance (Phase 7A, business-blueprint
 * section 2.18) live in this same module rather than a separate one: unlike
 * customer opening balance (a distinct `customer-credit` permission
 * resource, Admin/Super Admin only), supplier opening balance uses the
 * existing `supplier:update`/`supplier:read` permissions — all three roles —
 * so there is no separate permission resource that would require a second
 * six-file module. The balance figure is never cached, the same as customer
 * credit status — see docs/technical-blueprint.md section 4A.3.
 */

const AUDIT_MODULE = 'suppliers';
const CACHE_MODULE = 'suppliers';
const LIST_TTL_SECONDS = 300;

export async function listSuppliers(filters: ListSuppliersFilters): Promise<ListSuppliersResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findSuppliers(filters);
    return { suppliers: rows.map(toSummary), totalRecords: total };
  });
}

export async function getSupplier(id: string): Promise<SupplierSummary> {
  return toSummary(await requireSupplier(id));
}

export async function createSupplier(
  input: CreateSupplierInput,
  context: RequestContext,
): Promise<SupplierSummary> {
  await assertPhoneAvailable(input.phone);
  await assertEmailAvailable(input.email);

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const supplier = await insertSupplier(input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_SUPPLIER',
      module: AUDIT_MODULE,
      entityType: 'Supplier',
      entityId: supplier.id,
      updatedData: toAuditSnapshot(supplier),
    });

    return supplier;
  });

  await invalidateSupplierCache();

  return toSummary(created);
}

export async function editSupplier(
  id: string,
  input: UpdateSupplierInput,
  context: RequestContext,
): Promise<SupplierSummary> {
  const existing = await requireSupplier(id);

  if (input.phone !== undefined) {
    await assertPhoneAvailable(input.phone, id);
  }
  if (input.email !== undefined) {
    await assertEmailAvailable(input.email, id);
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const supplier = await updateSupplier(id, input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_SUPPLIER',
      module: AUDIT_MODULE,
      entityType: 'Supplier',
      entityId: id,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(supplier),
    });

    return supplier;
  });

  await invalidateSupplierCache();

  return toSummary(updated);
}

export async function activateSupplier(
  id: string,
  context: RequestContext,
): Promise<SupplierSummary> {
  return changeActiveState(id, true, context);
}

export async function deactivateSupplier(
  id: string,
  context: RequestContext,
): Promise<SupplierSummary> {
  return changeActiveState(id, false, context);
}

async function changeActiveState(
  id: string,
  isActive: boolean,
  context: RequestContext,
): Promise<SupplierSummary> {
  const existing = await requireSupplier(id);

  if (existing.isActive === isActive) {
    throw new BusinessRuleViolationError(
      isActive ? 'This supplier is already active.' : 'This supplier is already inactive.',
    );
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const supplier = await setSupplierActive(id, isActive, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: isActive ? 'ACTIVATE_SUPPLIER' : 'DEACTIVATE_SUPPLIER',
      module: AUDIT_MODULE,
      entityType: 'Supplier',
      entityId: id,
      previousData: { isActive: existing.isActive },
      updatedData: { isActive },
    });

    return supplier;
  });

  await invalidateSupplierCache();

  return toSummary(updated);
}

/**
 * Sets or corrects the supplier's opening balance — money already owed
 * before this system started (business-blueprint section 2.18). Corrected
 * in place, one row per supplier, full before/after history in the audit
 * log — the same pattern `customer-credit.service.ts`'s `setOpeningBalance`
 * already established.
 *
 * Deliberately does not require the supplier to be active: a supplier's
 * opening balance must remain traceable even after it is deactivated.
 */
export async function setSupplierOpeningBalance(
  supplierId: string,
  input: SetSupplierOpeningBalanceInput,
  context: RequestContext,
): Promise<SupplierOpeningBalanceDetail> {
  await requireSupplier(supplierId);
  const existing = await findSupplierOpeningBalance(supplierId);

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const balance = await upsertSupplierOpeningBalance(supplierId, input, context.user.id, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'SET_SUPPLIER_OPENING_BALANCE',
      module: AUDIT_MODULE,
      entityType: 'SupplierOpeningBalance',
      entityId: balance.id,
      reason: input.reason,
      previousData: existing ? toOpeningBalanceAuditSnapshot(existing) : null,
      updatedData: toOpeningBalanceAuditSnapshot(balance),
    });

    return balance;
  });

  await invalidateSupplierCache();

  return toOpeningBalanceDetail(updated);
}

/**
 * The supplier's outstanding balance. Never cached — always read live from
 * MySQL, the same as `customer-credit.service.ts`'s `computeCreditStatus`.
 *
 * `outstandingBalance = openingBalance + Σ(Purchase.totalCost)` (Phase 7C).
 * `openingBalance` in the response stays the opening balance alone — only
 * `outstandingBalance` combines both terms, the same split
 * `CreditStatusResult`/`openingBalance` vs `outstandingBalance` already uses
 * for customers. Purchase-payment deductions are Phase 7D — see
 * `SupplierBalanceResult`'s doc comment for the full formula once they exist.
 */
export async function getSupplierBalance(supplierId: string): Promise<SupplierBalanceResult> {
  await requireSupplier(supplierId);

  const [openingBalanceRow, purchaseTotals] = await Promise.all([
    findSupplierOpeningBalance(supplierId),
    sumPurchaseTotals(supplierId),
  ]);
  const openingBalance = openingBalanceRow?.amount ?? new Prisma.Decimal(0);
  const outstandingBalance = openingBalance.add(purchaseTotals);

  return {
    supplierId,
    openingBalance: openingBalance.toFixed(2),
    outstandingBalance: outstandingBalance.toFixed(2),
  };
}

function toOpeningBalanceDetail(row: SupplierOpeningBalanceRow): SupplierOpeningBalanceDetail {
  return {
    supplierId: row.supplierId,
    amount: row.amount.toFixed(2),
    effectiveDate: row.effectiveDate.toISOString(),
    reason: row.reason,
    enteredByUserId: row.enteredByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toOpeningBalanceAuditSnapshot(row: SupplierOpeningBalanceRow): Record<string, unknown> {
  return {
    amount: row.amount.toFixed(2),
    effectiveDate: row.effectiveDate.toISOString(),
    reason: row.reason,
  };
}

async function requireSupplier(id: string): Promise<SupplierRow> {
  const supplier = await findSupplierById(id);

  if (!supplier) {
    throw new ResourceNotFoundError('That supplier was not found.');
  }

  return supplier;
}

/**
 * Rejects a phone number already on file, compared on the normalised value so
 * "0722123456" and "+254 722 123456" are recognised as the same line.
 */
async function assertPhoneAvailable(phone: string, exceptId?: string): Promise<void> {
  const existing = await findSupplierByPhone(phone);

  if (existing && existing.id !== exceptId) {
    throw new BusinessRuleViolationError(`This phone number already belongs to ${existing.name}.`);
  }
}

/** Rejects an email address already on file, compared case-insensitively. */
async function assertEmailAvailable(
  email: string | null | undefined,
  exceptId?: string,
): Promise<void> {
  if (!email) {
    return;
  }

  const existing = await findSupplierByEmail(email);

  if (existing && existing.id !== exceptId) {
    throw new BusinessRuleViolationError(`This email address already belongs to ${existing.name}.`);
  }
}

async function invalidateSupplierCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListSuppliersFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `a=${filters.isActive === undefined ? '' : String(filters.isActive)}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: SupplierRow): SupplierSummary {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: SupplierRow): Record<string, unknown> {
  return {
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    isActive: row.isActive,
  };
}
