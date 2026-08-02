import type {
  CuringDuration,
  CuringRecord,
  Prisma,
  ProductionBatch,
  ProductionItem,
  ProductionOrderAllocation,
  Product,
  RawMaterial,
  RawMaterialUsage,
} from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient, TransactionClient } from '../../shared/database/transaction.js';
import type { ListProductionFilters } from './production.types.js';

/**
 * Production database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type ProductionItemRow = ProductionItem & {
  product: Product;
  curingRecord: CuringRecord | null;
};
export type RawMaterialUsageRow = RawMaterialUsage & {
  rawMaterial: RawMaterial & { measurementUnit: { symbol: string | null } };
};
export type ProductionBatchRow = ProductionBatch & {
  order: { orderNumber: string } | null;
  _count: { items: number };
};
export type ProductionBatchDetailRow = ProductionBatch & {
  order: { orderNumber: string } | null;
  items: ProductionItemRow[];
  rawMaterialUsages: RawMaterialUsageRow[];
};

function buildWhere(filters: ListProductionFilters): Prisma.ProductionBatchWhereInput {
  const where: Prisma.ProductionBatchWhereInput = {};

  if (filters.search) {
    where.productionNumber = { contains: filters.search };
  }
  if (filters.purpose !== undefined) {
    where.purpose = filters.purpose;
  }
  if (filters.orderId !== undefined) {
    where.orderId = filters.orderId;
  }
  if (filters.status !== undefined) {
    where.status = filters.status;
  }

  return where;
}

export async function findProductionBatches(
  filters: ListProductionFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: ProductionBatchRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.productionBatch.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      include: { order: { select: { orderNumber: true } }, _count: { select: { items: true } } },
    }),
    client.productionBatch.count({ where }),
  ]);

  return { rows, total };
}

export async function findProductionBatchById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<ProductionBatchDetailRow | null> {
  return client.productionBatch.findUnique({
    where: { id },
    include: {
      order: { select: { orderNumber: true } },
      items: { include: { product: true, curingRecord: true }, orderBy: { createdAt: 'asc' } },
      rawMaterialUsages: {
        include: { rawMaterial: { include: { measurementUnit: { select: { symbol: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function insertProductionBatch(
  input: {
    productionNumber: string;
    productionDate: Date;
    purpose: Prisma.ProductionBatchCreateInput['purpose'];
    orderId: string | null;
    createdByUserId: string | null;
    items: {
      productId: string;
      pallets: number;
      producedQuantity: number;
      brokenQuantity: number;
      usableQuantity: number;
      allocatedQuantity: number;
      excessQuantity: number;
    }[];
    rawMaterialUsages: { rawMaterialId: string; measurementUnitId: string; quantity: Prisma.Decimal }[];
  },
  client: DbClient = getPrisma(),
): Promise<ProductionBatchDetailRow> {
  return client.productionBatch.create({
    data: {
      productionNumber: input.productionNumber,
      productionDate: input.productionDate,
      purpose: input.purpose,
      orderId: input.orderId,
      createdByUserId: input.createdByUserId,
      items: { create: input.items },
      rawMaterialUsages: { create: input.rawMaterialUsages },
    },
    include: {
      order: { select: { orderNumber: true } },
      items: { include: { product: true, curingRecord: true }, orderBy: { createdAt: 'asc' } },
      rawMaterialUsages: {
        include: { rawMaterial: { include: { measurementUnit: { select: { symbol: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function insertCuringRecord(
  tx: TransactionClient,
  input: {
    productionItemId: string;
    productionBatchId: string;
    quantityEntering: number;
    duration: CuringDuration;
    startedAt: Date;
    plannedCompletion: Date;
    createdByUserId: string | null;
  },
): Promise<CuringRecord> {
  return tx.curingRecord.create({
    data: {
      productionItemId: input.productionItemId,
      productionBatchId: input.productionBatchId,
      quantityEntering: input.quantityEntering,
      originalDuration: input.duration,
      currentDuration: input.duration,
      startedAt: input.startedAt,
      plannedCompletion: input.plannedCompletion,
      createdByUserId: input.createdByUserId,
    },
  });
}

export async function insertProductionOrderAllocations(
  tx: TransactionClient,
  allocations: { productionItemId: string; orderItemId: string; quantity: number }[],
): Promise<void> {
  if (allocations.length === 0) {
    return;
  }

  await tx.productionOrderAllocation.createMany({ data: allocations });
}

export async function findProductionItemForRelease(
  productionItemId: string,
  client: DbClient = getPrisma(),
): Promise<
  | (ProductionItem & {
      allocations: ProductionOrderAllocation[];
    })
  | null
> {
  return client.productionItem.findUnique({
    where: { id: productionItemId },
    include: { allocations: true },
  });
}

export async function markBatchCompleted(
  tx: TransactionClient,
  productionBatchId: string,
): Promise<void> {
  await tx.productionBatch.update({
    where: { id: productionBatchId },
    data: { status: 'COMPLETED' },
  });
}
