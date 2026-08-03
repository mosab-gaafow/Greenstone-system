import type {
  MeasurementUnit,
  Prisma,
  Purchase,
  PurchaseItem,
  RawMaterial,
} from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type { ListPurchasesFilters } from './purchases.types.js';

/**
 * Purchase database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type PurchaseItemRow = PurchaseItem & {
  rawMaterial: RawMaterial;
  measurementUnit: MeasurementUnit;
};
export type PurchaseRow = Purchase & {
  supplier: { name: string };
  _count: { items: number };
};
export type PurchaseDetailRow = Purchase & {
  supplier: { name: string };
  items: PurchaseItemRow[];
};

function buildWhere(filters: ListPurchasesFilters): Prisma.PurchaseWhereInput {
  const where: Prisma.PurchaseWhereInput = {};

  if (filters.search) {
    where.purchaseNumber = { contains: filters.search };
  }
  if (filters.supplierId !== undefined) {
    where.supplierId = filters.supplierId;
  }
  if (filters.rawMaterialId !== undefined) {
    where.items = { some: { rawMaterialId: filters.rawMaterialId } };
  }

  return where;
}

export async function findPurchases(
  filters: ListPurchasesFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: PurchaseRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.purchase.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      include: { supplier: { select: { name: true } }, _count: { select: { items: true } } },
    }),
    client.purchase.count({ where }),
  ]);

  return { rows, total };
}

export async function findPurchaseById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<PurchaseDetailRow | null> {
  return client.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true } },
      items: {
        include: { rawMaterial: true, measurementUnit: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function insertPurchase(
  input: {
    purchaseNumber: string;
    supplierId: string;
    purchaseDate: Date;
    reference: string | null;
    totalCost: Prisma.Decimal;
    createdByUserId: string | null;
    items: {
      rawMaterialId: string;
      measurementUnitId: string;
      quantity: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      lengthMetres: Prisma.Decimal | null;
      widthMetres: Prisma.Decimal | null;
      heightMetres: Prisma.Decimal | null;
      numberOfLoads: number | null;
    }[];
  },
  client: DbClient = getPrisma(),
): Promise<PurchaseDetailRow> {
  return client.purchase.create({
    data: {
      purchaseNumber: input.purchaseNumber,
      supplierId: input.supplierId,
      purchaseDate: input.purchaseDate,
      reference: input.reference,
      totalCost: input.totalCost,
      createdByUserId: input.createdByUserId,
      items: { create: input.items },
    },
    include: {
      supplier: { select: { name: true } },
      items: {
        include: { rawMaterial: true, measurementUnit: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}
