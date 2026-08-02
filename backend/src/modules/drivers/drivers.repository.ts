import type { Driver, Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type { CreateDriverInput, ListDriversFilters, UpdateDriverInput } from './drivers.types.js';

/**
 * Driver database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type DriverRow = Driver;

/**
 * Normalises a national ID for the uniqueness check.
 *
 * Uppercased, with every space removed (not just collapsed) — an ID number
 * has no meaningful internal spacing, unlike a name or address.
 */
export function normalizeNationalId(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

function buildWhere(filters: ListDriversFilters): Prisma.DriverWhereInput {
  const where: Prisma.DriverWhereInput = {};

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

export async function findDrivers(
  filters: ListDriversFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: DriverRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.driver.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
    }),
    client.driver.count({ where }),
  ]);

  return { rows, total };
}

export async function findDriverById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<DriverRow | null> {
  return client.driver.findUnique({ where: { id } });
}

/** Finds a driver by normalised national ID. The real duplicate check. */
export async function findDriverByNationalId(
  nationalId: string,
  client: DbClient = getPrisma(),
): Promise<DriverRow | null> {
  return client.driver.findUnique({
    where: { nationalIdNormalized: normalizeNationalId(nationalId) },
  });
}

export async function insertDriver(
  input: CreateDriverInput,
  client: DbClient = getPrisma(),
): Promise<DriverRow> {
  return client.driver.create({
    data: {
      name: input.name,
      phone: input.phone,
      nationalId: input.nationalId,
      nationalIdNormalized: normalizeNationalId(input.nationalId),
    },
  });
}

export async function updateDriver(
  id: string,
  input: UpdateDriverInput,
  client: DbClient = getPrisma(),
): Promise<DriverRow> {
  const data: Prisma.DriverUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
  }
  if (input.nationalId !== undefined) {
    data.nationalId = input.nationalId;
    data.nationalIdNormalized = normalizeNationalId(input.nationalId);
  }

  return client.driver.update({ where: { id }, data });
}

export async function setDriverActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<DriverRow> {
  return client.driver.update({ where: { id }, data: { isActive } });
}
