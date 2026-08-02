import type { BrokenProductRecord, Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient, TransactionClient } from '../../shared/database/transaction.js';
import type {
  CreateBrokenProductRecordInput,
  ListBrokenProductRecordsFilters,
} from './broken-products.types.js';

/**
 * Broken product database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type BrokenProductRecordRow = BrokenProductRecord & { product: { name: string } };

function buildWhere(
  filters: ListBrokenProductRecordsFilters,
): Prisma.BrokenProductRecordWhereInput {
  const where: Prisma.BrokenProductRecordWhereInput = {};

  if (filters.productId !== undefined) {
    where.productId = filters.productId;
  }
  if (filters.stage !== undefined) {
    where.stage = filters.stage;
  }

  return where;
}

export async function findBrokenProductRecords(
  filters: ListBrokenProductRecordsFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: BrokenProductRecordRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.brokenProductRecord.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true } } },
    }),
    client.brokenProductRecord.count({ where }),
  ]);

  return { rows, total };
}

export async function insertBrokenProductRecord(
  tx: TransactionClient,
  input: CreateBrokenProductRecordInput & { recordedByUserId: string | null },
): Promise<BrokenProductRecordRow> {
  return tx.brokenProductRecord.create({
    data: {
      productId: input.productId,
      quantity: input.quantity,
      stage: input.stage,
      relatedEntityId: input.relatedEntityId ?? null,
      reason: input.reason ?? null,
      recordedByUserId: input.recordedByUserId,
    },
    include: { product: { select: { name: true } } },
  });
}
