import {
  findMeasurementUnitByName,
  findMeasurementUnitById,
  findMeasurementUnits,
  insertMeasurementUnit,
  setMeasurementUnitActive,
  updateMeasurementUnit,
  type MeasurementUnitRow,
} from './measurement-units.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import type {
  CreateMeasurementUnitInput,
  ListMeasurementUnitsFilters,
  ListMeasurementUnitsResult,
  MeasurementUnitSummary,
  UpdateMeasurementUnitInput,
} from './measurement-units.types.js';

/**
 * Measurement unit business logic. See business-blueprint section 2.13.
 *
 * Units are never deleted, only activated and deactivated — a raw material
 * references its unit permanently.
 */

const AUDIT_MODULE = 'measurement-units';
const CACHE_MODULE = 'measurement-units';
const LIST_TTL_SECONDS = 300;

export async function listMeasurementUnits(
  filters: ListMeasurementUnitsFilters,
): Promise<ListMeasurementUnitsResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findMeasurementUnits(filters);
    return { measurementUnits: rows.map(toSummary), totalRecords: total };
  });
}

export async function getMeasurementUnit(id: string): Promise<MeasurementUnitSummary> {
  return toSummary(await requireMeasurementUnit(id));
}

export async function createMeasurementUnit(
  input: CreateMeasurementUnitInput,
  context: RequestContext,
): Promise<MeasurementUnitSummary> {
  await assertNameAvailable(input.name);

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const unit = await insertMeasurementUnit(input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_MEASUREMENT_UNIT',
      module: AUDIT_MODULE,
      entityType: 'MeasurementUnit',
      entityId: unit.id,
      updatedData: toAuditSnapshot(unit),
    });

    return unit;
  });

  await invalidateCache();

  return toSummary(created);
}

export async function editMeasurementUnit(
  id: string,
  input: UpdateMeasurementUnitInput,
  context: RequestContext,
): Promise<MeasurementUnitSummary> {
  const existing = await requireMeasurementUnit(id);

  if (input.name !== undefined && input.name !== existing.name) {
    await assertNameAvailable(input.name);
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const unit = await updateMeasurementUnit(id, input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_MEASUREMENT_UNIT',
      module: AUDIT_MODULE,
      entityType: 'MeasurementUnit',
      entityId: id,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(unit),
    });

    return unit;
  });

  await invalidateCache();

  return toSummary(updated);
}

export async function activateMeasurementUnit(
  id: string,
  context: RequestContext,
): Promise<MeasurementUnitSummary> {
  return changeActiveState(id, true, context);
}

export async function deactivateMeasurementUnit(
  id: string,
  context: RequestContext,
): Promise<MeasurementUnitSummary> {
  return changeActiveState(id, false, context);
}

async function changeActiveState(
  id: string,
  isActive: boolean,
  context: RequestContext,
): Promise<MeasurementUnitSummary> {
  const existing = await requireMeasurementUnit(id);

  if (existing.isActive === isActive) {
    throw new BusinessRuleViolationError(
      isActive ? 'This unit is already active.' : 'This unit is already inactive.',
    );
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const unit = await setMeasurementUnitActive(id, isActive, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: isActive ? 'ACTIVATE_MEASUREMENT_UNIT' : 'DEACTIVATE_MEASUREMENT_UNIT',
      module: AUDIT_MODULE,
      entityType: 'MeasurementUnit',
      entityId: id,
      previousData: { isActive: existing.isActive },
      updatedData: { isActive },
    });

    return unit;
  });

  await invalidateCache();

  return toSummary(updated);
}

export async function requireMeasurementUnit(id: string): Promise<MeasurementUnitRow> {
  const unit = await findMeasurementUnitById(id);

  if (!unit) {
    throw new ResourceNotFoundError('That measurement unit was not found.');
  }

  return unit;
}

async function assertNameAvailable(name: string): Promise<void> {
  if (await findMeasurementUnitByName(name)) {
    throw new BusinessRuleViolationError('A measurement unit with this name already exists.');
  }
}

async function invalidateCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListMeasurementUnitsFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `a=${filters.isActive === undefined ? '' : String(filters.isActive)}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: MeasurementUnitRow): MeasurementUnitSummary {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: MeasurementUnitRow): Record<string, unknown> {
  return {
    name: row.name,
    symbol: row.symbol,
    isActive: row.isActive,
  };
}
