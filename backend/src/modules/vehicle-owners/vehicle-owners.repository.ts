import type { Prisma, VehicleOwner } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import { normalizeNationalId, normalizePhone } from '../../shared/utils/normalize.js';
import type {
  CreateVehicleOwnerInput,
  ListVehicleOwnersFilters,
  UpdateVehicleOwnerInput,
} from './vehicle-owners.types.js';

/**
 * Vehicle Owner database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type VehicleOwnerRow = VehicleOwner;

function buildWhere(filters: ListVehicleOwnersFilters): Prisma.VehicleOwnerWhereInput {
  const where: Prisma.VehicleOwnerWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { phone: { contains: filters.search } },
      { nationalId: { contains: filters.search } },
    ];
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return where;
}

export async function findVehicleOwners(
  filters: ListVehicleOwnersFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: VehicleOwnerRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.vehicleOwner.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
    }),
    client.vehicleOwner.count({ where }),
  ]);

  return { rows, total };
}

export async function findVehicleOwnerById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<VehicleOwnerRow | null> {
  return client.vehicleOwner.findUnique({ where: { id } });
}

/** Finds a vehicle owner by normalised phone. The real duplicate check. */
export async function findVehicleOwnerByPhone(
  phone: string,
  client: DbClient = getPrisma(),
): Promise<VehicleOwnerRow | null> {
  return client.vehicleOwner.findUnique({ where: { phoneNormalized: normalizePhone(phone) } });
}

/** Finds a vehicle owner by normalised national ID. */
export async function findVehicleOwnerByNationalId(
  nationalId: string,
  client: DbClient = getPrisma(),
): Promise<VehicleOwnerRow | null> {
  return client.vehicleOwner.findUnique({
    where: { nationalIdNormalized: normalizeNationalId(nationalId) },
  });
}

export async function insertVehicleOwner(
  input: CreateVehicleOwnerInput,
  client: DbClient = getPrisma(),
): Promise<VehicleOwnerRow> {
  return client.vehicleOwner.create({
    data: {
      name: input.name,
      phone: input.phone,
      phoneNormalized: normalizePhone(input.phone),
      nationalId: input.nationalId ?? null,
      nationalIdNormalized: input.nationalId ? normalizeNationalId(input.nationalId) : null,
    },
  });
}

export async function updateVehicleOwner(
  id: string,
  input: UpdateVehicleOwnerInput,
  client: DbClient = getPrisma(),
): Promise<VehicleOwnerRow> {
  const data: Prisma.VehicleOwnerUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
    data.phoneNormalized = normalizePhone(input.phone);
  }
  if (input.nationalId !== undefined) {
    data.nationalId = input.nationalId;
    data.nationalIdNormalized = input.nationalId ? normalizeNationalId(input.nationalId) : null;
  }

  return client.vehicleOwner.update({ where: { id }, data });
}

export async function setVehicleOwnerActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<VehicleOwnerRow> {
  return client.vehicleOwner.update({ where: { id }, data: { isActive } });
}
