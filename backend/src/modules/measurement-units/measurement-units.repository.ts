import type { MeasurementUnit, Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import { normalizeForComparison } from '../../shared/utils/normalize.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type {
  CreateMeasurementUnitInput,
  ListMeasurementUnitsFilters,
  UpdateMeasurementUnitInput,
} from './measurement-units.types.js';

/**
 * Measurement unit database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type MeasurementUnitRow = MeasurementUnit;

function buildWhere(filters: ListMeasurementUnitsFilters): Prisma.MeasurementUnitWhereInput {
  const where: Prisma.MeasurementUnitWhereInput = {};

  if (filters.search) {
    where.name = { contains: filters.search };
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return where;
}

export async function findMeasurementUnits(
  filters: ListMeasurementUnitsFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: MeasurementUnitRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.measurementUnit.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
    }),
    client.measurementUnit.count({ where }),
  ]);

  return { rows, total };
}

export async function findMeasurementUnitById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<MeasurementUnitRow | null> {
  return client.measurementUnit.findUnique({ where: { id } });
}

/** Finds a unit by its normalised name. The real duplicate check. */
export async function findMeasurementUnitByName(
  name: string,
  client: DbClient = getPrisma(),
): Promise<MeasurementUnitRow | null> {
  return client.measurementUnit.findUnique({
    where: { nameNormalized: normalizeForComparison(name) },
  });
}

export async function insertMeasurementUnit(
  input: CreateMeasurementUnitInput,
  client: DbClient = getPrisma(),
): Promise<MeasurementUnitRow> {
  return client.measurementUnit.create({
    data: {
      name: input.name,
      nameNormalized: normalizeForComparison(input.name),
      symbol: input.symbol ?? null,
    },
  });
}

export async function updateMeasurementUnit(
  id: string,
  input: UpdateMeasurementUnitInput,
  client: DbClient = getPrisma(),
): Promise<MeasurementUnitRow> {
  const data: Prisma.MeasurementUnitUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
    data.nameNormalized = normalizeForComparison(input.name);
  }
  if (input.symbol !== undefined) {
    data.symbol = input.symbol;
  }

  return client.measurementUnit.update({ where: { id }, data });
}

export async function setMeasurementUnitActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<MeasurementUnitRow> {
  return client.measurementUnit.update({ where: { id }, data: { isActive } });
}
