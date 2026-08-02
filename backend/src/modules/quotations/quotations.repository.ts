import type {
  Prisma,
  Product,
  Quotation,
  QuotationItem,
  QuotationStatus,
} from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type { ListQuotationsFilters, QuotationItemInput } from './quotations.types.js';

/**
 * Quotation database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type QuotationRow = Quotation & { customer: { name: string }; _count: { items: number } };
export type QuotationItemRow = QuotationItem & { product: Product };
export type QuotationDetailRow = Quotation & {
  customer: { name: string };
  items: QuotationItemRow[];
};

function buildWhere(filters: ListQuotationsFilters): Prisma.QuotationWhereInput {
  const where: Prisma.QuotationWhereInput = {};

  if (filters.search) {
    where.OR = [
      { quotationNumber: { contains: filters.search } },
      { customer: { name: { contains: filters.search } } },
    ];
  }

  if (filters.status !== undefined) {
    where.status = filters.status;
  }

  if (filters.customerId !== undefined) {
    where.customerId = filters.customerId;
  }

  return where;
}

export async function findQuotations(
  filters: ListQuotationsFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: QuotationRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.quotation.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      include: { customer: { select: { name: true } }, _count: { select: { items: true } } },
    }),
    client.quotation.count({ where }),
  ]);

  return { rows, total };
}

export async function findQuotationById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<QuotationDetailRow | null> {
  return client.quotation.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true } },
      items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
}

export async function insertQuotation(
  input: {
    quotationNumber: string;
    customerId: string;
    totalAmount: Prisma.Decimal;
    items: (QuotationItemInput & { lineTotal: Prisma.Decimal })[];
  },
  client: DbClient = getPrisma(),
): Promise<QuotationDetailRow> {
  const quotation = await client.quotation.create({
    data: {
      quotationNumber: input.quotationNumber,
      customerId: input.customerId,
      totalAmount: input.totalAmount,
      items: {
        create: input.items.map((item, index) => ({
          productId: item.productId,
          quantity: item.quantity,
          agreedUnitPrice: item.agreedUnitPrice,
          lineTotal: item.lineTotal,
          sortOrder: index,
        })),
      },
    },
    include: {
      customer: { select: { name: true } },
      items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
    },
  });

  return quotation;
}

export async function replaceQuotationItems(
  quotationId: string,
  items: (QuotationItemInput & { lineTotal: Prisma.Decimal })[],
  client: DbClient = getPrisma(),
): Promise<void> {
  await client.quotationItem.deleteMany({ where: { quotationId } });
  await client.quotationItem.createMany({
    data: items.map((item, index) => ({
      quotationId,
      productId: item.productId,
      quantity: item.quantity,
      agreedUnitPrice: item.agreedUnitPrice,
      lineTotal: item.lineTotal,
      sortOrder: index,
    })),
  });
}

export async function updateQuotationFields(
  id: string,
  data: { customerId?: string | undefined; totalAmount?: Prisma.Decimal | undefined },
  client: DbClient = getPrisma(),
): Promise<Quotation> {
  const updateData: Prisma.QuotationUpdateInput = {};

  if (data.customerId !== undefined) {
    updateData.customer = { connect: { id: data.customerId } };
  }
  if (data.totalAmount !== undefined) {
    updateData.totalAmount = data.totalAmount;
  }

  return client.quotation.update({ where: { id }, data: updateData });
}

export async function setQuotationStatus(
  id: string,
  status: QuotationStatus,
  statusReason: string | null,
  client: DbClient = getPrisma(),
): Promise<Quotation> {
  return client.quotation.update({ where: { id }, data: { status, statusReason } });
}
