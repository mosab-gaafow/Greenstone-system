import type { VehicleRow } from './vehicles.repository.js';
import {
  findVehicleById,
  findVehicleByRegistration,
  findVehicles,
  insertVehicle,
  setVehicleActive,
  updateVehicle,
} from './vehicles.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import { requireActiveVehicleOwner } from '../vehicle-owners/vehicle-owners.service.js';
import type {
  CreateVehicleInput,
  ListVehiclesFilters,
  ListVehiclesResult,
  UpdateVehicleInput,
  VehicleSummary,
} from './vehicles.types.js';

/**
 * Vehicle business logic.
 *
 * Vehicles are never deleted, only activated and deactivated — delivery
 * history will reference them permanently once deliveries exist.
 *
 * Phase 6F: every vehicle requires a registered, active `VehicleOwner` —
 * confirmed via the `vehicle-owners` module's own service
 * (`requireActiveVehicleOwner`), never a direct query into that module's
 * repository. The old volumetric truck-load calculation is gone entirely;
 * see the `Vehicle` model's doc comment in schema.prisma for why.
 */

const AUDIT_MODULE = 'vehicles';
const CACHE_MODULE = 'vehicles';
const LIST_TTL_SECONDS = 300;

export async function listVehicles(filters: ListVehiclesFilters): Promise<ListVehiclesResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findVehicles(filters);
    return { vehicles: rows.map(toSummary), totalRecords: total };
  });
}

export async function getVehicle(id: string): Promise<VehicleSummary> {
  return toSummary(await requireVehicle(id));
}

export async function createVehicle(
  input: CreateVehicleInput,
  context: RequestContext,
): Promise<VehicleSummary> {
  await assertRegistrationAvailable(input.registrationNumber);
  await requireActiveVehicleOwner(input.vehicleOwnerId);

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const vehicle = await insertVehicle(
      {
        registrationNumber: input.registrationNumber,
        vehicleType: input.vehicleType,
        vehicleOwnerId: input.vehicleOwnerId,
      },
      tx,
    );

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_VEHICLE',
      module: AUDIT_MODULE,
      entityType: 'Vehicle',
      entityId: vehicle.id,
      updatedData: toAuditSnapshot(vehicle),
    });

    return vehicle;
  });

  await invalidateVehicleCache();

  return toSummary(created);
}

export async function editVehicle(
  id: string,
  input: UpdateVehicleInput,
  context: RequestContext,
): Promise<VehicleSummary> {
  const existing = await requireVehicle(id);

  if (
    input.registrationNumber !== undefined &&
    input.registrationNumber !== existing.registrationNumber
  ) {
    await assertRegistrationAvailable(input.registrationNumber, id);
  }

  if (input.vehicleOwnerId !== undefined && input.vehicleOwnerId !== existing.vehicleOwnerId) {
    await requireActiveVehicleOwner(input.vehicleOwnerId);
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const vehicle = await updateVehicle(
      id,
      {
        registrationNumber: input.registrationNumber,
        vehicleType: input.vehicleType,
        vehicleOwnerId: input.vehicleOwnerId,
      },
      tx,
    );

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_VEHICLE',
      module: AUDIT_MODULE,
      entityType: 'Vehicle',
      entityId: id,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(vehicle),
    });

    return vehicle;
  });

  await invalidateVehicleCache();

  return toSummary(updated);
}

export async function activateVehicle(id: string, context: RequestContext): Promise<VehicleSummary> {
  return changeActiveState(id, true, context);
}

export async function deactivateVehicle(id: string, context: RequestContext): Promise<VehicleSummary> {
  return changeActiveState(id, false, context);
}

async function changeActiveState(
  id: string,
  isActive: boolean,
  context: RequestContext,
): Promise<VehicleSummary> {
  const existing = await requireVehicle(id);

  if (existing.isActive === isActive) {
    throw new BusinessRuleViolationError(
      isActive ? 'This vehicle is already active.' : 'This vehicle is already inactive.',
    );
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const vehicle = await setVehicleActive(id, isActive, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: isActive ? 'ACTIVATE_VEHICLE' : 'DEACTIVATE_VEHICLE',
      module: AUDIT_MODULE,
      entityType: 'Vehicle',
      entityId: id,
      previousData: { isActive: existing.isActive },
      updatedData: { isActive },
    });

    return vehicle;
  });

  await invalidateVehicleCache();

  return toSummary(updated);
}

// --- Helpers ----------------------------------------------------------------

async function requireVehicle(id: string): Promise<VehicleRow> {
  const vehicle = await findVehicleById(id);

  if (!vehicle) {
    throw new ResourceNotFoundError('That vehicle was not found.');
  }

  return vehicle;
}

/**
 * Rejects a registration number already on file.
 *
 * Compared on the normalised value, so "KDA 123X" and "kda123x" are recognised
 * as the same plate.
 */
async function assertRegistrationAvailable(
  registrationNumber: string,
  exceptId?: string,
): Promise<void> {
  const existing = await findVehicleByRegistration(registrationNumber);

  if (existing && existing.id !== exceptId) {
    throw new BusinessRuleViolationError(
      `A vehicle with registration number ${existing.registrationNumber} already exists.`,
    );
  }
}

/**
 * Invalidates every cached vehicle list entry.
 *
 * Exported so `vehicle-owners.service.ts` can invalidate it after its own
 * writes commit — a Vehicle Owner's name/active-status change must
 * invalidate this list too, since it denormalises `vehicleOwnerName`.
 */
export async function invalidateVehicleCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListVehiclesFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `a=${filters.isActive === undefined ? '' : String(filters.isActive)}`,
    `srt=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: VehicleRow): VehicleSummary {
  return {
    id: row.id,
    registrationNumber: row.registrationNumber,
    vehicleType: row.vehicleType,
    vehicleOwnerId: row.vehicleOwnerId,
    vehicleOwnerName: row.vehicleOwner.name,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: VehicleRow): Record<string, unknown> {
  return {
    registrationNumber: row.registrationNumber,
    vehicleType: row.vehicleType,
    vehicleOwnerId: row.vehicleOwnerId,
    vehicleOwnerName: row.vehicleOwner.name,
    isActive: row.isActive,
  };
}
