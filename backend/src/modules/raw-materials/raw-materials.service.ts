import { Prisma } from '../../generated/prisma/client.js';
import {
  findMovements,
  findRawMaterialByName,
  findRawMaterialById,
  findRawMaterials,
  findStockBalance,
  insertMovement,
  insertRawMaterial,
  lockStockBalance,
  setRawMaterialActive,
  setStockBalanceQuantity,
  updateRawMaterial,
  type MovementRow,
  type RawMaterialRow,
  type StockBalanceRow,
} from './raw-materials.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import {
  BusinessRuleViolationError,
  InsufficientRawMaterialError,
  ResourceNotFoundError,
} from '../../shared/errors/app-error.js';
import * as measurementUnitsService from '../measurement-units/measurement-units.service.js';
import type {
  AdjustRawMaterialStockInput,
  CreateRawMaterialInput,
  ListRawMaterialMovementsFilters,
  ListRawMaterialMovementsResult,
  ListRawMaterialsFilters,
  ListRawMaterialsResult,
  RawMaterialMovementSummary,
  RawMaterialStockDetail,
  RawMaterialSummary,
  SetOpeningRawMaterialStockInput,
  UpdateRawMaterialInput,
} from './raw-materials.types.js';

/**
 * Raw material business logic. See business-blueprint sections 2.12–2.15.
 *
 * Master data (name, unit, reorder level) is cached like every other
 * master-data list. Stock balance and movements are **never cached** — see
 * docs/technical-blueprint.md section 4A.3 ("raw-material availability during
 * a transaction" is one of the values that must always be read live).
 *
 * Balance updates always run inside a transaction holding a row lock
 * (`lockStockBalance`), the same pessimistic-locking pattern document
 * numbering uses — never a bare read-then-write.
 */

const AUDIT_MODULE = 'raw-materials';
const CACHE_MODULE = 'raw-materials';
const LIST_TTL_SECONDS = 300;

export async function listRawMaterials(
  filters: ListRawMaterialsFilters,
): Promise<ListRawMaterialsResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findRawMaterials(filters);
    return { rawMaterials: rows.map(toSummary), totalRecords: total };
  });
}

export async function getRawMaterial(id: string): Promise<RawMaterialSummary> {
  return toSummary(await requireRawMaterial(id));
}

export async function createRawMaterial(
  input: CreateRawMaterialInput,
  context: RequestContext,
): Promise<RawMaterialSummary> {
  await assertNameAvailable(input.name);
  await assertMeasurementUnitActive(input.measurementUnitId);

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const rawMaterial = await insertRawMaterial(input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_RAW_MATERIAL',
      module: AUDIT_MODULE,
      entityType: 'RawMaterial',
      entityId: rawMaterial.id,
      updatedData: toAuditSnapshot(rawMaterial),
    });

    return rawMaterial;
  });

  await invalidateCache();

  return toSummary(created);
}

export async function editRawMaterial(
  id: string,
  input: UpdateRawMaterialInput,
  context: RequestContext,
): Promise<RawMaterialSummary> {
  const existing = await requireRawMaterial(id);

  if (input.name !== undefined && input.name !== existing.name) {
    await assertNameAvailable(input.name);
  }
  if (input.measurementUnitId !== undefined) {
    await assertMeasurementUnitActive(input.measurementUnitId);
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const rawMaterial = await updateRawMaterial(id, input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_RAW_MATERIAL',
      module: AUDIT_MODULE,
      entityType: 'RawMaterial',
      entityId: id,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(rawMaterial),
    });

    return rawMaterial;
  });

  await invalidateCache();

  return toSummary(updated);
}

export async function activateRawMaterial(
  id: string,
  context: RequestContext,
): Promise<RawMaterialSummary> {
  return changeActiveState(id, true, context);
}

export async function deactivateRawMaterial(
  id: string,
  context: RequestContext,
): Promise<RawMaterialSummary> {
  return changeActiveState(id, false, context);
}

async function changeActiveState(
  id: string,
  isActive: boolean,
  context: RequestContext,
): Promise<RawMaterialSummary> {
  const existing = await requireRawMaterial(id);

  if (existing.isActive === isActive) {
    throw new BusinessRuleViolationError(
      isActive ? 'This raw material is already active.' : 'This raw material is already inactive.',
    );
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const rawMaterial = await setRawMaterialActive(id, isActive, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: isActive ? 'ACTIVATE_RAW_MATERIAL' : 'DEACTIVATE_RAW_MATERIAL',
      module: AUDIT_MODULE,
      entityType: 'RawMaterial',
      entityId: id,
      previousData: { isActive: existing.isActive },
      updatedData: { isActive },
    });

    return rawMaterial;
  });

  await invalidateCache();

  return toSummary(updated);
}

export async function getStock(rawMaterialId: string): Promise<RawMaterialStockDetail> {
  await requireRawMaterial(rawMaterialId);

  const balance = await findStockBalance(rawMaterialId);

  if (!balance) {
    throw new ResourceNotFoundError('That raw material has no stock balance.');
  }

  return toStockDetail(balance);
}

export async function listMovements(
  rawMaterialId: string,
  filters: ListRawMaterialMovementsFilters,
): Promise<ListRawMaterialMovementsResult> {
  await requireRawMaterial(rawMaterialId);

  const { rows, total } = await findMovements(rawMaterialId, filters);

  return { movements: rows.map(toMovementSummary), totalRecords: total };
}

/**
 * Sets the balance to an absolute quantity — business-blueprint section 2.15.
 * Used once during production setup, and available afterwards as a traceable
 * correction, the same "corrected in place, full history in the movement
 * ledger and audit log" shape as `CustomerOpeningBalance`.
 */
export async function setOpeningStock(
  rawMaterialId: string,
  input: SetOpeningRawMaterialStockInput,
  context: RequestContext,
): Promise<RawMaterialStockDetail> {
  await requireRawMaterial(rawMaterialId);

  const newQuantity = new Prisma.Decimal(input.quantity);

  if (newQuantity.isNegative()) {
    throw new BusinessRuleViolationError('Opening quantity cannot be negative.');
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const balance = await lockStockBalance(tx, rawMaterialId);
    const delta = newQuantity.sub(balance.quantity);

    const newBalance = await setStockBalanceQuantity(tx, rawMaterialId, newQuantity);

    await insertMovement(tx, {
      rawMaterialId,
      movementType: 'OPENING',
      quantity: delta,
      balanceAfter: newQuantity,
      reason: input.reason ?? null,
      createdByUserId: context.user.id,
    });

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'SET_RAW_MATERIAL_OPENING_STOCK',
      module: AUDIT_MODULE,
      entityType: 'RawMaterialStockBalance',
      entityId: rawMaterialId,
      reason: input.reason ?? null,
      previousData: { quantity: balance.quantity.toFixed(3) },
      updatedData: { quantity: newQuantity.toFixed(3) },
    });

    return newBalance;
  });

  return toStockDetail(updated);
}

/**
 * Applies a signed delta to the current balance, with a required written
 * reason — matches the "Stock Correction... Written reason" field the
 * technical blueprint requires for adjustments (section 4.7), applied here to
 * raw material.
 */
export async function adjustStock(
  rawMaterialId: string,
  input: AdjustRawMaterialStockInput,
  context: RequestContext,
): Promise<RawMaterialStockDetail> {
  await requireRawMaterial(rawMaterialId);

  const delta = new Prisma.Decimal(input.quantity);

  if (delta.isZero()) {
    throw new BusinessRuleViolationError('Enter a non-zero adjustment quantity.');
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const balance = await lockStockBalance(tx, rawMaterialId);
    const newQuantity = balance.quantity.add(delta);

    if (newQuantity.isNegative()) {
      throw new InsufficientRawMaterialError(
        'This adjustment would take the raw-material balance below zero.',
      );
    }

    const newBalance = await setStockBalanceQuantity(tx, rawMaterialId, newQuantity);

    await insertMovement(tx, {
      rawMaterialId,
      movementType: delta.isPositive() ? 'POSITIVE_ADJUSTMENT' : 'NEGATIVE_ADJUSTMENT',
      quantity: delta,
      balanceAfter: newQuantity,
      reason: input.reason,
      createdByUserId: context.user.id,
    });

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'ADJUST_RAW_MATERIAL_STOCK',
      module: AUDIT_MODULE,
      entityType: 'RawMaterialStockBalance',
      entityId: rawMaterialId,
      reason: input.reason,
      previousData: { quantity: balance.quantity.toFixed(3) },
      updatedData: { quantity: newQuantity.toFixed(3) },
    });

    return newBalance;
  });

  return toStockDetail(updated);
}

/**
 * Records actual raw-material usage inside the caller's existing
 * transaction. Used by `production.service.ts` when a production batch
 * consumes raw material — the same "accept a caller-supplied `tx`" pattern
 * `customer-credit.service.ts` uses for its override recorder.
 *
 * Never a fixed formula (business-blueprint section 2.12) — `quantity` is
 * whatever the caller measured.
 */
export async function recordProductionUsage(
  tx: TransactionClient,
  rawMaterialId: string,
  quantity: Prisma.Decimal,
  relatedEntityId: string,
  context: RequestContext,
): Promise<void> {
  const balance = await lockStockBalance(tx, rawMaterialId);
  const newQuantity = balance.quantity.sub(quantity);

  if (newQuantity.isNegative()) {
    const rawMaterial = await findRawMaterialById(rawMaterialId, tx);
    throw new InsufficientRawMaterialError(
      `Not enough "${rawMaterial?.name ?? 'raw material'}" in stock for this production run.`,
    );
  }

  await setStockBalanceQuantity(tx, rawMaterialId, newQuantity);

  await insertMovement(tx, {
    rawMaterialId,
    movementType: 'PRODUCTION_USAGE',
    quantity: quantity.negated(),
    balanceAfter: newQuantity,
    relatedEntityId,
    createdByUserId: context.user.id,
  });
}

/**
 * Records a purchase receipt inside the caller's existing transaction. Used
 * by `purchases.service.ts` when a purchase is created — creating a purchase
 * is receiving it (business-blueprint section 2.16), so this always credits
 * stock immediately, the same "accept a caller-supplied `tx`" pattern
 * `recordProductionUsage` above already uses, just adding instead of
 * subtracting.
 */
export async function recordPurchaseReceipt(
  tx: TransactionClient,
  rawMaterialId: string,
  quantity: Prisma.Decimal,
  relatedEntityId: string,
  context: RequestContext,
): Promise<void> {
  const balance = await lockStockBalance(tx, rawMaterialId);
  const newQuantity = balance.quantity.add(quantity);

  await setStockBalanceQuantity(tx, rawMaterialId, newQuantity);

  await insertMovement(tx, {
    rawMaterialId,
    movementType: 'PURCHASE_RECEIPT',
    quantity,
    balanceAfter: newQuantity,
    relatedEntityId,
    createdByUserId: context.user.id,
  });
}

// --- Helpers ----------------------------------------------------------------

export async function requireRawMaterial(id: string): Promise<RawMaterialRow> {
  const rawMaterial = await findRawMaterialById(id);

  if (!rawMaterial) {
    throw new ResourceNotFoundError('That raw material was not found.');
  }

  return rawMaterial;
}

async function assertNameAvailable(name: string): Promise<void> {
  if (await findRawMaterialByName(name)) {
    throw new BusinessRuleViolationError('A raw material with this name already exists.');
  }
}

async function assertMeasurementUnitActive(measurementUnitId: string): Promise<void> {
  const unit = await measurementUnitsService.getMeasurementUnit(measurementUnitId);

  if (!unit.isActive) {
    throw new BusinessRuleViolationError(`"${unit.name}" is inactive and cannot be used.`);
  }
}

async function invalidateCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListRawMaterialsFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `a=${filters.isActive === undefined ? '' : String(filters.isActive)}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: RawMaterialRow): RawMaterialSummary {
  return {
    id: row.id,
    name: row.name,
    measurementUnitId: row.measurementUnitId,
    measurementUnitName: row.measurementUnit.name,
    measurementUnitSymbol: row.measurementUnit.symbol,
    reorderLevel: row.reorderLevel ? row.reorderLevel.toFixed(3) : null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: RawMaterialRow): Record<string, unknown> {
  return {
    name: row.name,
    measurementUnitId: row.measurementUnitId,
    reorderLevel: row.reorderLevel ? row.reorderLevel.toFixed(3) : null,
    isActive: row.isActive,
  };
}

function toStockDetail(row: StockBalanceRow): RawMaterialStockDetail {
  return {
    rawMaterialId: row.rawMaterialId,
    quantity: row.quantity.toFixed(3),
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMovementSummary(row: MovementRow): RawMaterialMovementSummary {
  return {
    id: row.id,
    movementType: row.movementType,
    quantity: row.quantity.toFixed(3),
    balanceAfter: row.balanceAfter.toFixed(3),
    relatedEntityId: row.relatedEntityId,
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}
