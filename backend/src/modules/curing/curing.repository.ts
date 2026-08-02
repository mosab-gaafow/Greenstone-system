import type { CuringDuration, CuringRecord, Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient, TransactionClient } from '../../shared/database/transaction.js';
import type { ListCuringFilters } from './curing.types.js';

/**
 * Curing database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type CuringRecordRow = CuringRecord & {
  productionItem: {
    productId: string;
    product: { name: string };
    productionBatch: { productionNumber: string };
  };
};

const DETAIL_INCLUDE = {
  productionItem: {
    select: {
      productId: true,
      product: { select: { name: true } },
      productionBatch: { select: { productionNumber: true } },
    },
  },
} as const;

function buildWhere(filters: ListCuringFilters): Prisma.CuringRecordWhereInput {
  const where: Prisma.CuringRecordWhereInput = {};

  if (filters.status === 'PENDING') {
    where.actualRelease = null;
  } else if (filters.status === 'RELEASED') {
    where.actualRelease = { not: null };
  }

  if (filters.productId !== undefined) {
    where.productionItem = { productId: filters.productId };
  }

  return where;
}

export async function findCuringRecords(
  filters: ListCuringFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: CuringRecordRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.curingRecord.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      include: DETAIL_INCLUDE,
    }),
    client.curingRecord.count({ where }),
  ]);

  return { rows, total };
}

export async function findCuringRecordById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<CuringRecordRow | null> {
  return client.curingRecord.findUnique({ where: { id }, include: DETAIL_INCLUDE });
}

export async function updateCuringDuration(
  tx: TransactionClient,
  id: string,
  input: {
    currentDuration: CuringDuration;
    plannedCompletion: Date;
    durationChangeReason: string;
    changedByUserId: string | null;
    changedAt: Date;
  },
): Promise<CuringRecord> {
  return tx.curingRecord.update({ where: { id }, data: input });
}

export async function releaseCuringRecord(
  tx: TransactionClient,
  id: string,
  input: {
    actualRelease: Date;
    brokenQuantity: number;
    releasedQuantity: number;
    releasedByUserId: string | null;
  },
): Promise<CuringRecord> {
  return tx.curingRecord.update({ where: { id }, data: input });
}

/** Used to decide whether a production batch's status flips to `COMPLETED`. */
export async function countPendingInBatch(
  tx: TransactionClient,
  productionBatchId: string,
): Promise<number> {
  return tx.curingRecord.count({ where: { productionBatchId, actualRelease: null } });
}
