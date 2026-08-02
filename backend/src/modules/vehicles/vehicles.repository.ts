import type { Vehicle, Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type { ListVehiclesFilters } from './vehicles.types.js';

/**
 * Vehicle database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks. The
 * truck-load calculation happens in the service layer — this file only
 * persists whatever values it is given.
 */

export type VehicleRow = Vehicle;

/**
 * Normalises a registration number for the uniqueness check.
 *
 * Unlike `normalizeForComparison` (used for names and labels, where a single
 * space is meaningful), a plate written "KDA 123X" and "kda123x" is the same
 * plate — so every space is removed, not just collapsed.
 */
export function normalizeRegistration(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

export interface VehicleWriteFields {
  registrationNumber: string;
  vehicleType: string;
  truckLengthM: Prisma.Decimal;
  truckWidthM: Prisma.Decimal;
  truckHeightM: Prisma.Decimal;
  calculationFactor: Prisma.Decimal;
  calculatedLoadKg: Prisma.Decimal;
  calculatedLoadTonnes: Prisma.Decimal;
}

export interface VehicleUpdateFields {
  registrationNumber?: string | undefined;
  vehicleType?: string | undefined;
  truckLengthM?: Prisma.Decimal | undefined;
  truckWidthM?: Prisma.Decimal | undefined;
  truckHeightM?: Prisma.Decimal | undefined;
  calculationFactor?: Prisma.Decimal | undefined;
  calculatedLoadKg?: Prisma.Decimal | undefined;
  calculatedLoadTonnes?: Prisma.Decimal | undefined;
}

function buildWhere(filters: ListVehiclesFilters): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {};

  if (filters.search) {
    where.OR = [
      { registrationNumber: { contains: filters.search } },
      { vehicleType: { contains: filters.search } },
    ];
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return where;
}

export async function findVehicles(
  filters: ListVehiclesFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: VehicleRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.vehicle.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
    }),
    client.vehicle.count({ where }),
  ]);

  return { rows, total };
}

export async function findVehicleById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<VehicleRow | null> {
  return client.vehicle.findUnique({ where: { id } });
}

/** Finds a vehicle by normalised registration number. The real duplicate check. */
export async function findVehicleByRegistration(
  registrationNumber: string,
  client: DbClient = getPrisma(),
): Promise<VehicleRow | null> {
  return client.vehicle.findUnique({
    where: { registrationNormalized: normalizeRegistration(registrationNumber) },
  });
}

/** Every registered vehicle is HIRED for the MVP — see vehicles.types.ts. */
export async function insertVehicle(
  data: VehicleWriteFields,
  client: DbClient = getPrisma(),
): Promise<VehicleRow> {
  return client.vehicle.create({
    data: {
      registrationNumber: data.registrationNumber,
      registrationNormalized: normalizeRegistration(data.registrationNumber),
      vehicleType: data.vehicleType,
      ownershipType: 'HIRED',
      truckLengthM: data.truckLengthM,
      truckWidthM: data.truckWidthM,
      truckHeightM: data.truckHeightM,
      calculationFactor: data.calculationFactor,
      calculatedLoadKg: data.calculatedLoadKg,
      calculatedLoadTonnes: data.calculatedLoadTonnes,
    },
  });
}

export async function updateVehicle(
  id: string,
  data: VehicleUpdateFields,
  client: DbClient = getPrisma(),
): Promise<VehicleRow> {
  const update: Prisma.VehicleUpdateInput = {};

  if (data.registrationNumber !== undefined) {
    update.registrationNumber = data.registrationNumber;
    update.registrationNormalized = normalizeRegistration(data.registrationNumber);
  }
  if (data.vehicleType !== undefined) {
    update.vehicleType = data.vehicleType;
  }
  if (data.truckLengthM !== undefined) {
    update.truckLengthM = data.truckLengthM;
  }
  if (data.truckWidthM !== undefined) {
    update.truckWidthM = data.truckWidthM;
  }
  if (data.truckHeightM !== undefined) {
    update.truckHeightM = data.truckHeightM;
  }
  if (data.calculationFactor !== undefined) {
    update.calculationFactor = data.calculationFactor;
  }
  if (data.calculatedLoadKg !== undefined) {
    update.calculatedLoadKg = data.calculatedLoadKg;
  }
  if (data.calculatedLoadTonnes !== undefined) {
    update.calculatedLoadTonnes = data.calculatedLoadTonnes;
  }

  return client.vehicle.update({ where: { id }, data: update });
}

export async function setVehicleActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<VehicleRow> {
  return client.vehicle.update({ where: { id }, data: { isActive } });
}
