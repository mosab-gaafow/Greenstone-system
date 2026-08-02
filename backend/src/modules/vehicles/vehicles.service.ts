import { Prisma } from '../../generated/prisma/client.js';
import type { VehicleRow, VehicleUpdateFields, VehicleWriteFields } from './vehicles.repository.js';
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
 * The truck-load calculation is the one piece of real arithmetic here. Every
 * vehicle requires all three dimensions; the factor and calculated figures
 * are a backend-only snapshot — see docs/implementation-plan.md Phase 4C. A
 * future change to the default factor must never rewrite an already-saved
 * vehicle's stored figures.
 */

const AUDIT_MODULE = 'vehicles';
const CACHE_MODULE = 'vehicles';
const LIST_TTL_SECONDS = 300;

/**
 * The sole authority for the calculation factor. Never accepted from a
 * request — the frontend may preview the same formula, but the value a
 * vehicle is saved with always comes from here.
 */
const DEFAULT_CALCULATION_FACTOR = 1100;

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

  const load = calculateTruckLoad(input.truckLengthM, input.truckWidthM, input.truckHeightM);

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const vehicle = await insertVehicle(
      {
        registrationNumber: input.registrationNumber,
        vehicleType: input.vehicleType,
        truckLengthM: new Prisma.Decimal(input.truckLengthM),
        truckWidthM: new Prisma.Decimal(input.truckWidthM),
        truckHeightM: new Prisma.Decimal(input.truckHeightM),
        ...load,
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

  const dimensionsChanged =
    input.truckLengthM !== undefined ||
    input.truckWidthM !== undefined ||
    input.truckHeightM !== undefined;

  const writeFields: VehicleUpdateFields = {
    registrationNumber: input.registrationNumber,
    vehicleType: input.vehicleType,
  };

  if (dimensionsChanged) {
    const length = input.truckLengthM ?? existing.truckLengthM.toString();
    const width = input.truckWidthM ?? existing.truckWidthM.toString();
    const height = input.truckHeightM ?? existing.truckHeightM.toString();
    const load = calculateTruckLoad(length, width, height);

    writeFields.truckLengthM = new Prisma.Decimal(length);
    writeFields.truckWidthM = new Prisma.Decimal(width);
    writeFields.truckHeightM = new Prisma.Decimal(height);
    writeFields.calculationFactor = load.calculationFactor;
    writeFields.calculatedLoadKg = load.calculatedLoadKg;
    writeFields.calculatedLoadTonnes = load.calculatedLoadTonnes;
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const vehicle = await updateVehicle(id, writeFields, tx);

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

function calculateTruckLoad(
  lengthM: string,
  widthM: string,
  heightM: string,
): Pick<VehicleWriteFields, 'calculationFactor' | 'calculatedLoadKg' | 'calculatedLoadTonnes'> {
  const factor = new Prisma.Decimal(DEFAULT_CALCULATION_FACTOR);
  const kg = new Prisma.Decimal(lengthM).mul(widthM).mul(heightM).mul(factor);

  return { calculationFactor: factor, calculatedLoadKg: kg, calculatedLoadTonnes: kg.div(1000) };
}

async function invalidateVehicleCache(): Promise<void> {
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
    ownershipType: row.ownershipType,
    truckLengthM: row.truckLengthM.toFixed(2),
    truckWidthM: row.truckWidthM.toFixed(2),
    truckHeightM: row.truckHeightM.toFixed(2),
    calculationFactor: row.calculationFactor.toFixed(2),
    calculatedLoadKg: row.calculatedLoadKg.toFixed(2),
    calculatedLoadTonnes: row.calculatedLoadTonnes.toFixed(3),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: VehicleRow): Record<string, unknown> {
  return {
    registrationNumber: row.registrationNumber,
    vehicleType: row.vehicleType,
    truckLengthM: row.truckLengthM.toFixed(2),
    truckWidthM: row.truckWidthM.toFixed(2),
    truckHeightM: row.truckHeightM.toFixed(2),
    calculationFactor: row.calculationFactor.toFixed(2),
    calculatedLoadKg: row.calculatedLoadKg.toFixed(2),
    calculatedLoadTonnes: row.calculatedLoadTonnes.toFixed(3),
    isActive: row.isActive,
  };
}
