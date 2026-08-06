import type { Prisma, Receipt } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type { ListReceiptsFilters } from './receipts.types.js';

export type ReceiptRow = Receipt & {
  payment: {
    id: string;
    paymentNumber: string;
    status: string;
    amount: Prisma.Decimal;
    paymentMethod: string;
    paymentReference: string | null;
    paymentDate: Date;
    approvedAt: Date | null;
    approvedByUser: { name: string } | null;
    reversedAt: Date | null;
    reversalReason: string | null;
    allocations: {
      id: string;
      invoiceId: string;
      amount: Prisma.Decimal;
      invoice: { invoiceNumber: string; order: { orderNumber: string } };
    }[];
  };
  customer: { id: string; name: string; phone: string | null };
};

export async function findReceiptById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<ReceiptRow | null> {
  return client.receipt.findUnique({
    where: { id },
    include: {
      payment: {
        select: {
          id: true,
          paymentNumber: true,
          status: true,
          amount: true,
          paymentMethod: true,
          paymentReference: true,
          paymentDate: true,
          approvedAt: true,
          approvedByUser: { select: { name: true } },
          reversedAt: true,
          reversalReason: true,
          allocations: {
            select: {
              id: true,
              invoiceId: true,
              amount: true,
              invoice: { select: { invoiceNumber: true, order: { select: { orderNumber: true } } } },
            },
          },
        },
      },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
}

export type ReceiptListRow = Receipt & {
  customer: { name: string };
  payment: { paymentNumber: string; paymentMethod: string; paymentReference: string | null; allocations: { invoice: { invoiceNumber: string } }[] };
};

export async function findReceipts(
  filters: ListReceiptsFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: ReceiptListRow[]; total: number }> {
  const where: Prisma.ReceiptWhereInput = {};

  if (filters.search) {
    where.receiptNumber = { contains: filters.search };
  }

  if (filters.status) where.status = filters.status;
  if (filters.paymentMethod) where.payment = { paymentMethod: filters.paymentMethod as any };

  const [rows, total] = await Promise.all([
    client.receipt.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      include: {
        customer: { select: { name: true } },
        payment: {
          select: {
            paymentNumber: true,
            paymentMethod: true,
            paymentReference: true,
            allocations: { select: { invoice: { select: { invoiceNumber: true } } }, take: 1 },
          },
        },
      },
    }),
    client.receipt.count({ where }),
  ]);

  return { rows, total };
}
