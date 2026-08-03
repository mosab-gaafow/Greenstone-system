import type { Prisma, Vehicle } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import { normalizeRegistration } from '../../shared/utils/normalize.js';
import type { ListVehiclesFilters } from './vehicles.types.js';

/**
 * Vehicle database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks. Owner
 * validation (exists, active) happens in the service layer, via
 * `vehicle-owners.service.ts`'s exported `requireActiveVehicleOwner` — this
 * file only persists whatever `vehicleOwnerId` it is given.
 */

export type VehicleRow = Vehicle & { vehicleOwner: { name: string } };

export interface VehicleWriteFields {
  registrationNumber: string;
  vehicleType: string;
  vehicleOwnerId: string;
}

export interface VehicleUpdateFields {
  registrationNumber?: string | undefined;
  vehicleType?: string | undefined;
  vehicleOwnerId?: string | undefined;
}

function buildWhere(filters: ListVehiclesFilters): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {};

  if (filters.search) {
    where.OR = [
      { registrationNumber: { contains: filters.search } },
      { vehicleType: { contains: filters.search } },
      { vehicleOwner: { name: { contains: filters.search } } },
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
      include: { vehicleOwner: { select: { name: true } } },
    }),
    client.vehicle.count({ where }),
  ]);

  return { rows, total };
}

export async function findVehicleById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<VehicleRow | null> {
  return client.vehicle.findUnique({
    where: { id },
    include: { vehicleOwner: { select: { name: true } } },
  });
}

/** Finds a vehicle by normalised registration number. The real duplicate check. */
export async function findVehicleByRegistration(
  registrationNumber: string,
  client: DbClient = getPrisma(),
): Promise<VehicleRow | null> {
  return client.vehicle.findUnique({
    where: { registrationNormalized: normalizeRegistration(registrationNumber) },
    include: { vehicleOwner: { select: { name: true } } },
  });
}

export async function insertVehicle(
  data: VehicleWriteFields,
  client: DbClient = getPrisma(),
): Promise<VehicleRow> {
  return client.vehicle.create({
    data: {
      registrationNumber: data.registrationNumber,
      registrationNormalized: normalizeRegistration(data.registrationNumber),
      vehicleType: data.vehicleType,
      vehicleOwnerId: data.vehicleOwnerId,
    },
    include: { vehicleOwner: { select: { name: true } } },
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
  if (data.vehicleOwnerId !== undefined) {
    update.vehicleOwner = { connect: { id: data.vehicleOwnerId } };
  }

  return client.vehicle.update({
    where: { id },
    data: update,
    include: { vehicleOwner: { select: { name: true } } },
  });
}

export async function setVehicleActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<VehicleRow> {
  return client.vehicle.update({
    where: { id },
    data: { isActive },
    include: { vehicleOwner: { select: { name: true } } },
  });
}
