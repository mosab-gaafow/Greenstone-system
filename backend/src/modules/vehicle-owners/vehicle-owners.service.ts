import type { VehicleOwnerRow } from './vehicle-owners.repository.js';
import {
  findVehicleOwnerByNationalId,
  findVehicleOwnerByPhone,
  findVehicleOwnerById,
  findVehicleOwners,
  insertVehicleOwner,
  setVehicleOwnerActive,
  updateVehicleOwner,
} from './vehicle-owners.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import {
  BusinessRuleViolationError,
  ResourceNotFoundError,
} from '../../shared/errors/app-error.js';
import type {
  CreateVehicleOwnerInput,
  ListVehicleOwnersFilters,
  ListVehicleOwnersResult,
  UpdateVehicleOwnerInput,
  VehicleOwnerSummary,
} from './vehicle-owners.types.js';

/**
 * Vehicle Owner business logic. See business-blueprint section 2.20 and
 * docs/implementation-plan.md Phase 6F.
 *
 * Vehicle Owners are never deleted, only activated and deactivated — the
 * `Vehicle.vehicleOwnerId` foreign key uses `onDelete: Restrict`, so a
 * Vehicle Owner with registered vehicles can never be removed underneath
 * them anyway.
 *
 * A Driver may also be a Vehicle Owner in real life, but this module creates
 * no automatic link or merge between the two records — see the decision
 * document section 10.
 */

const AUDIT_MODULE = 'vehicle-owners';
const CACHE_MODULE = 'vehicle-owners';
const LIST_TTL_SECONDS = 300;

export async function listVehicleOwners(
  filters: ListVehicleOwnersFilters,
): Promise<ListVehicleOwnersResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findVehicleOwners(filters);
    return { vehicleOwners: rows.map(toSummary), totalRecords: total };
  });
}

export async function getVehicleOwner(id: string): Promise<VehicleOwnerSummary> {
  return toSummary(await requireVehicleOwner(id));
}

/**
 * Used by `vehicles.service.ts` to confirm a referenced owner exists and is
 * active before a Vehicle is created or its owner changed — the same
 * "read directly, no cross-module service call needed either way" shape
 * used elsewhere, except here `vehicles` genuinely needs this module's
 * business validation, so it calls this exported function rather than
 * querying the table directly.
 */
export async function requireActiveVehicleOwner(id: string): Promise<VehicleOwnerSummary> {
  const owner = await requireVehicleOwner(id);

  if (!owner.isActive) {
    throw new BusinessRuleViolationError(
      `"${owner.name}" is inactive and cannot be assigned to a vehicle.`,
    );
  }

  return toSummary(owner);
}

export async function createVehicleOwner(
  input: CreateVehicleOwnerInput,
  context: RequestContext,
): Promise<VehicleOwnerSummary> {
  await assertPhoneAvailable(input.phone);
  await assertNationalIdAvailable(input.nationalId);

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const vehicleOwner = await insertVehicleOwner(input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_VEHICLE_OWNER',
      module: AUDIT_MODULE,
      entityType: 'VehicleOwner',
      entityId: vehicleOwner.id,
      updatedData: toAuditSnapshot(vehicleOwner),
    });

    return vehicleOwner;
  });

  await invalidateVehicleOwnerCache();

  return toSummary(created);
}

export async function editVehicleOwner(
  id: string,
  input: UpdateVehicleOwnerInput,
  context: RequestContext,
): Promise<VehicleOwnerSummary> {
  const existing = await requireVehicleOwner(id);

  if (input.phone !== undefined && input.phone !== existing.phone) {
    await assertPhoneAvailable(input.phone, id);
  }
  if (
    input.nationalId !== undefined &&
    input.nationalId !== existing.nationalId &&
    input.nationalId != null
  ) {
    await assertNationalIdAvailable(input.nationalId, id);
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const vehicleOwner = await updateVehicleOwner(id, input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_VEHICLE_OWNER',
      module: AUDIT_MODULE,
      entityType: 'VehicleOwner',
      entityId: id,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(vehicleOwner),
    });

    return vehicleOwner;
  });

  await invalidateVehicleOwnerCache();

  return toSummary(updated);
}

export async function activateVehicleOwner(
  id: string,
  context: RequestContext,
): Promise<VehicleOwnerSummary> {
  return changeActiveState(id, true, context);
}

export async function deactivateVehicleOwner(
  id: string,
  context: RequestContext,
): Promise<VehicleOwnerSummary> {
  return changeActiveState(id, false, context);
}

async function changeActiveState(
  id: string,
  isActive: boolean,
  context: RequestContext,
): Promise<VehicleOwnerSummary> {
  const existing = await requireVehicleOwner(id);

  if (existing.isActive === isActive) {
    throw new BusinessRuleViolationError(
      isActive ? 'This vehicle owner is already active.' : 'This vehicle owner is already inactive.',
    );
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const vehicleOwner = await setVehicleOwnerActive(id, isActive, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: isActive ? 'ACTIVATE_VEHICLE_OWNER' : 'DEACTIVATE_VEHICLE_OWNER',
      module: AUDIT_MODULE,
      entityType: 'VehicleOwner',
      entityId: id,
      previousData: { isActive: existing.isActive },
      updatedData: { isActive },
    });

    return vehicleOwner;
  });

  await invalidateVehicleOwnerCache();

  return toSummary(updated);
}

// --- Helpers ----------------------------------------------------------------

async function requireVehicleOwner(id: string): Promise<VehicleOwnerRow> {
  const vehicleOwner = await findVehicleOwnerById(id);

  if (!vehicleOwner) {
    throw new ResourceNotFoundError('That vehicle owner was not found.');
  }

  return vehicleOwner;
}

/**
 * Rejects a phone number already on file.
 *
 * Compared on the normalised value, so "0722123456" and "+254722123456" are
 * recognised as the same line. `exceptId` lets a record keep its own number
 * while being edited.
 */
async function assertPhoneAvailable(phone: string, exceptId?: string): Promise<void> {
  const existing = await findVehicleOwnerByPhone(phone);

  if (existing && existing.id !== exceptId) {
    throw new BusinessRuleViolationError(
      `This phone number already belongs to ${existing.name}.`,
    );
  }
}

/** Rejects a national ID already on file. Optional field — skipped when absent. */
async function assertNationalIdAvailable(
  nationalId: string | null | undefined,
  exceptId?: string,
): Promise<void> {
  if (!nationalId) {
    return;
  }

  const existing = await findVehicleOwnerByNationalId(nationalId);

  if (existing && existing.id !== exceptId) {
    throw new BusinessRuleViolationError(
      `This national ID already belongs to ${existing.name}.`,
    );
  }
}

/**
 * Invalidates every cached vehicle-owner list entry.
 *
 * **Deliberately does not also invalidate the `vehicles` list cache**, even
 * though it denormalises a Vehicle Owner's name/active status: `vehicles`
 * already depends on this module (`requireActiveVehicleOwner`), so the
 * reverse call would create a circular module dependency between the two.
 * A stale denormalised name/status in a cached vehicle list self-heals
 * within the list's own TTL (300s) — the same "missed invalidation
 * self-heals" trade-off `docs/technical-blueprint.md` section 4A.4 already
 * accepts everywhere else in this codebase.
 */
export async function invalidateVehicleOwnerCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListVehicleOwnersFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `a=${filters.isActive === undefined ? '' : String(filters.isActive)}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: VehicleOwnerRow): VehicleOwnerSummary {
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

function toAuditSnapshot(row: VehicleOwnerRow): Record<string, unknown> {
  return {
    name: row.name,
    phone: row.phone,
    nationalId: row.nationalId,
    isActive: row.isActive,
  };
}
