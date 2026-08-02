import type { DriverRow } from './drivers.repository.js';
import {
  findDriverById,
  findDriverByNationalId,
  findDrivers,
  insertDriver,
  setDriverActive,
  updateDriver,
} from './drivers.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import type {
  CreateDriverInput,
  DriverSummary,
  ListDriversFilters,
  ListDriversResult,
  UpdateDriverInput,
} from './drivers.types.js';

/**
 * Driver business logic.
 *
 * Drivers are never deleted, only activated and deactivated — delivery
 * history will reference them permanently once deliveries exist.
 */

const AUDIT_MODULE = 'drivers';
const CACHE_MODULE = 'drivers';
const LIST_TTL_SECONDS = 300;

export async function listDrivers(filters: ListDriversFilters): Promise<ListDriversResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findDrivers(filters);
    return { drivers: rows.map(toSummary), totalRecords: total };
  });
}

export async function getDriver(id: string): Promise<DriverSummary> {
  return toSummary(await requireDriver(id));
}

export async function createDriver(
  input: CreateDriverInput,
  context: RequestContext,
): Promise<DriverSummary> {
  await assertNationalIdAvailable(input.nationalId);

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const driver = await insertDriver(input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_DRIVER',
      module: AUDIT_MODULE,
      entityType: 'Driver',
      entityId: driver.id,
      updatedData: toAuditSnapshot(driver),
    });

    return driver;
  });

  await invalidateDriverCache();

  return toSummary(created);
}

export async function editDriver(
  id: string,
  input: UpdateDriverInput,
  context: RequestContext,
): Promise<DriverSummary> {
  const existing = await requireDriver(id);

  if (input.nationalId !== undefined && input.nationalId !== existing.nationalId) {
    await assertNationalIdAvailable(input.nationalId, id);
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const driver = await updateDriver(id, input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_DRIVER',
      module: AUDIT_MODULE,
      entityType: 'Driver',
      entityId: id,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(driver),
    });

    return driver;
  });

  await invalidateDriverCache();

  return toSummary(updated);
}

export async function activateDriver(id: string, context: RequestContext): Promise<DriverSummary> {
  return changeActiveState(id, true, context);
}

export async function deactivateDriver(id: string, context: RequestContext): Promise<DriverSummary> {
  return changeActiveState(id, false, context);
}

async function changeActiveState(
  id: string,
  isActive: boolean,
  context: RequestContext,
): Promise<DriverSummary> {
  const existing = await requireDriver(id);

  if (existing.isActive === isActive) {
    throw new BusinessRuleViolationError(
      isActive ? 'This driver is already active.' : 'This driver is already inactive.',
    );
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const driver = await setDriverActive(id, isActive, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: isActive ? 'ACTIVATE_DRIVER' : 'DEACTIVATE_DRIVER',
      module: AUDIT_MODULE,
      entityType: 'Driver',
      entityId: id,
      previousData: { isActive: existing.isActive },
      updatedData: { isActive },
    });

    return driver;
  });

  await invalidateDriverCache();

  return toSummary(updated);
}

async function requireDriver(id: string): Promise<DriverRow> {
  const driver = await findDriverById(id);

  if (!driver) {
    throw new ResourceNotFoundError('That driver was not found.');
  }

  return driver;
}

/**
 * Rejects a national ID already on file.
 *
 * Compared on the normalised value, so editing a record can never silently
 * turn it into a duplicate of another.
 */
async function assertNationalIdAvailable(nationalId: string, exceptId?: string): Promise<void> {
  const existing = await findDriverByNationalId(nationalId);

  if (existing && existing.id !== exceptId) {
    throw new BusinessRuleViolationError(
      `This national ID already belongs to ${existing.name}.`,
    );
  }
}

async function invalidateDriverCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListDriversFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `a=${filters.isActive === undefined ? '' : String(filters.isActive)}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: DriverRow): DriverSummary {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    nationalId: row.nationalId,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: DriverRow): Record<string, unknown> {
  return { name: row.name, phone: row.phone, nationalId: row.nationalId, isActive: row.isActive };
}
