import type {
  Prisma,
  RawMaterial,
  RawMaterialMovement,
  RawMaterialMovementType,
  RawMaterialStockBalance,
} from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import { normalizeForComparison } from '../../shared/utils/normalize.js';
import { lockRowsForUpdate, type DbClient, type TransactionClient } from '../../shared/database/transaction.js';
import type {
  CreateRawMaterialInput,
  ListRawMaterialMovementsFilters,
  ListRawMaterialsFilters,
  UpdateRawMaterialInput,
} from './raw-materials.types.js';

/**
 * Raw material database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type RawMaterialRow = RawMaterial & {
  measurementUnit: { name: string; symbol: string | null };
};
export type StockBalanceRow = RawMaterialStockBalance;
export type MovementRow = RawMaterialMovement;

function buildWhere(filters: ListRawMaterialsFilters): Prisma.RawMaterialWhereInput {
  const where: Prisma.RawMaterialWhereInput = {};

  if (filters.search) {
    where.name = { contains: filters.search };
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return where;
}

export async function findRawMaterials(
  filters: ListRawMaterialsFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: RawMaterialRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.rawMaterial.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      include: { measurementUnit: { select: { name: true, symbol: true } } },
    }),
    client.rawMaterial.count({ where }),
  ]);

  return { rows, total };
}

export async function findRawMaterialById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<RawMaterialRow | null> {
  return client.rawMaterial.findUnique({
    where: { id },
    include: { measurementUnit: { select: { name: true, symbol: true } } },
  });
}

/** Finds a raw material by its normalised name. The real duplicate check. */
export async function findRawMaterialByName(
  name: string,
  client: DbClient = getPrisma(),
): Promise<RawMaterialRow | null> {
  return client.rawMaterial.findUnique({
    where: { nameNormalized: normalizeForComparison(name) },
    include: { measurementUnit: { select: { name: true, symbol: true } } },
  });
}

/**
 * Creates the raw material and its zero-balance stock row together, so every
 * raw material always has exactly one stock balance from the moment it
 * exists — nothing else needs to treat "no balance yet" as a special case.
 */
export async function insertRawMaterial(
  input: CreateRawMaterialInput,
  client: DbClient = getPrisma(),
): Promise<RawMaterialRow> {
  return client.rawMaterial.create({
    data: {
      name: input.name,
      nameNormalized: normalizeForComparison(input.name),
      measurementUnitId: input.measurementUnitId,
      reorderLevel: input.reorderLevel ?? null,
      stockBalance: { create: { quantity: 0 } },
    },
    include: { measurementUnit: { select: { name: true, symbol: true } } },
  });
}

export async function updateRawMaterial(
  id: string,
  input: UpdateRawMaterialInput,
  client: DbClient = getPrisma(),
): Promise<RawMaterialRow> {
  const data: Prisma.RawMaterialUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
    data.nameNormalized = normalizeForComparison(input.name);
  }
  if (input.measurementUnitId !== undefined) {
    data.measurementUnit = { connect: { id: input.measurementUnitId } };
  }
  if (input.reorderLevel !== undefined) {
    data.reorderLevel = input.reorderLevel;
  }

  return client.rawMaterial.update({
    where: { id },
    data,
    include: { measurementUnit: { select: { name: true, symbol: true } } },
  });
}

export async function setRawMaterialActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<RawMaterialRow> {
  return client.rawMaterial.update({
    where: { id },
    data: { isActive },
    include: { measurementUnit: { select: { name: true, symbol: true } } },
  });
}

export async function findStockBalance(
  rawMaterialId: string,
  client: DbClient = getPrisma(),
): Promise<StockBalanceRow | null> {
  return client.rawMaterialStockBalance.findUnique({ where: { rawMaterialId } });
}

/**
 * Locks the balance row for the rest of the transaction, then returns it.
 * Callers must be inside `runInTransaction` — locking outside one gives no
 * protection, because the lock releases immediately.
 */
export async function lockStockBalance(
  tx: TransactionClient,
  rawMaterialId: string,
): Promise<StockBalanceRow> {
  await lockRowsForUpdate(tx, 'raw_material_stock_balances', 'rawMaterialId', rawMaterialId);

  const balance = await tx.rawMaterialStockBalance.findUnique({ where: { rawMaterialId } });

  if (!balance) {
    throw new Error(`Raw material ${rawMaterialId} has no stock balance row.`);
  }

  return balance;
}

export async function setStockBalanceQuantity(
  tx: TransactionClient,
  rawMaterialId: string,
  quantity: Prisma.Decimal,
): Promise<StockBalanceRow> {
  return tx.rawMaterialStockBalance.update({
    where: { rawMaterialId },
    data: { quantity, version: { increment: 1 } },
  });
}

export async function insertMovement(
  tx: TransactionClient,
  input: {
    rawMaterialId: string;
    movementType: RawMaterialMovementType;
    quantity: Prisma.Decimal;
    balanceAfter: Prisma.Decimal;
    relatedEntityId?: string | null;
    reason?: string | null;
    createdByUserId?: string | null;
  },
): Promise<MovementRow> {
  return tx.rawMaterialMovement.create({
    data: {
      rawMaterialId: input.rawMaterialId,
      movementType: input.movementType,
      quantity: input.quantity,
      balanceAfter: input.balanceAfter,
      relatedEntityId: input.relatedEntityId ?? null,
      reason: input.reason ?? null,
      createdByUserId: input.createdByUserId ?? null,
    },
  });
}

export async function findMovements(
  rawMaterialId: string,
  filters: ListRawMaterialMovementsFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: MovementRow[]; total: number }> {
  const where: Prisma.RawMaterialMovementWhereInput = { rawMaterialId };

  const [rows, total] = await Promise.all([
    client.rawMaterialMovement.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    client.rawMaterialMovement.count({ where }),
  ]);

  return { rows, total };
}
