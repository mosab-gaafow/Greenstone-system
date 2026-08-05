import { Prisma, type Invoice, type InvoiceItem, type Product } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient, TransactionClient } from '../../shared/database/transaction.js';
import type { ListInvoicesFilters } from './invoices.types.js';

export type InvoiceRow = Invoice & {
  order: { orderNumber: string };
  customer: { name: string };
  _count: { items: number };
};

export type InvoiceDetailRow = Invoice & {
  order: { orderNumber: string };
  customer: { name: string };
  items: (InvoiceItem & { product: Product })[];
  allocations?: any[];
};

function buildWhere(filters: ListInvoicesFilters): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {};
  if (filters.search) {
    where.OR = [
      { invoiceNumber: { contains: filters.search } },
      { customer: { name: { contains: filters.search } } },
      { order: { orderNumber: { contains: filters.search } } },
    ];
  }
  if (filters.status) where.status = filters.status;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.orderId) where.orderId = filters.orderId;
  return where;
}

export async function findInvoices(
  filters: ListInvoicesFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: InvoiceRow[]; total: number }> {
  const where = buildWhere(filters);
  const [rows, total] = await Promise.all([
    client.invoice.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      include: { order: { select: { orderNumber: true } }, customer: { select: { name: true } }, _count: { select: { items: true } } },
    }),
    client.invoice.count({ where }),
  ]);
  return { rows, total };
}

export async function findInvoiceById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<InvoiceDetailRow | null> {
  return client.invoice.findUnique({
    where: { id },
    include: {
      order: { select: { orderNumber: true } },
      customer: { select: { name: true } },
      items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
      allocations: { include: { payment: { select: { id: true, paymentNumber: true, status: true, paymentDate: true } } } },
    },
  });
}

export async function insertInvoice(
  tx: TransactionClient,
  input: {
    invoiceNumber: string;
    orderId: string;
    customerId: string;
    totalAmount: Prisma.Decimal;
    dueDate: Date;
    createdByUserId: string | null;
    items: { orderItemId: string; productId: string; productName: string; quantity: number; unitPrice: string; lineTotal: string }[];
  },
): Promise<InvoiceDetailRow> {
  return tx.invoice.create({
    data: {
      invoiceNumber: input.invoiceNumber,
      orderId: input.orderId,
      customerId: input.customerId,
      totalAmount: input.totalAmount,
      dueDate: input.dueDate,
      createdByUserId: input.createdByUserId,
      items: {
        create: input.items.map((item, i) => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          lineTotal: new Prisma.Decimal(item.lineTotal),
          sortOrder: i,
        })),
      },
    },
    include: {
      order: { select: { orderNumber: true } },
      customer: { select: { name: true } },
      items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
}

export async function voidInvoice(
  tx: TransactionClient,
  id: string,
  input: { voidedAt: Date; voidedByUserId: string | null; voidReason: string },
): Promise<Invoice> {
  return tx.invoice.update({
    where: { id, status: 'ISSUED' },
    data: { status: 'VOIDED', voidedAt: input.voidedAt, voidedByUserId: input.voidedByUserId, voidReason: input.voidReason },
  });
}
