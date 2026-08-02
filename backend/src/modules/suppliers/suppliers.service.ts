import {
  findSupplierByEmail,
  findSupplierByPhone,
  findSupplierById,
  findSuppliers,
  insertSupplier,
  setSupplierActive,
  updateSupplier,
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
  SupplierSummary,
  UpdateSupplierInput,
} from './suppliers.types.js';

/**
 * Supplier business logic.
 *
 * Master record only, per business-blueprint section 2.16. Suppliers are
 * never deleted, only activated and deactivated — purchases and purchase
 * payments (Phase 7) will reference them permanently.
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
