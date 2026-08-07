/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type {
  OrdersReportQuery, InvoicesReportQuery, PaymentsReportQuery,
  ReceiptsReportQuery, TopOrdersQuery, TopCustomersQuery,
  CustomerBalancesQuery,
} from './reports.types.js';

// ── Helpers ─────────────────────────────────────────────────────────

function searchOr(search: string | undefined, fields: Prisma.Enumerable<Prisma.OrderWhereInput>): Prisma.OrderWhereInput {
  if (!search) return {};
  return { OR: fields as any };
}

function invoiceSearchOr(search: string | undefined): Prisma.InvoiceWhereInput {
  if (!search) return {};
  return {
    OR: [
      { invoiceNumber: { contains: search } },
      { order: { orderNumber: { contains: search } } },
      { customer: { name: { contains: search } } },
    ] as any,
  };
}

function paymentSearchOr(search: string | undefined): Prisma.CustomerPaymentWhereInput {
  if (!search) return {};
  return {
    OR: [
      { paymentNumber: { contains: search } },
      { customer: { name: { contains: search } } },
      { paymentReference: { contains: search } },
    ] as any,
  };
}

function receiptSearchOr(search: string | undefined): Prisma.ReceiptWhereInput {
  if (!search) return {};
  return {
    OR: [
      { receiptNumber: { contains: search } },
      { customer: { name: { contains: search } } },
    ] as any,
  };
}

function orderWhere(query: OrdersReportQuery & { toEnd: Date }): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {
    ...searchOr(query.search, [{ orderNumber: { contains: query.search! } }, { customer: { name: { contains: query.search! } } }]),
    createdAt: { gte: query.from, lt: query.toEnd },
  };
  if (query.orderStatus) {
    where.status = query.orderStatus as any;
  } else {
    where.status = { not: 'CANCELLED' };
  }
  if (query.customerId) where.customerId = query.customerId;
  return where;
}

function invoiceWhere(query: InvoicesReportQuery & { toEnd: Date }): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {
    ...invoiceSearchOr(query.search),
    createdAt: { gte: query.from, lt: query.toEnd },
  };
  if (query.invoiceStatus) where.status = query.invoiceStatus as any;
  if (query.customerId) where.customerId = query.customerId;
  return where;
}

function paymentWhere(query: PaymentsReportQuery & { toEnd: Date }): Prisma.CustomerPaymentWhereInput {
  const where: Prisma.CustomerPaymentWhereInput = {
    ...paymentSearchOr(query.search),
    paymentDate: { gte: query.from, lt: query.toEnd },
  };
  if (query.paymentStatus) where.status = query.paymentStatus as any;
  if (query.paymentMethod) where.paymentMethod = query.paymentMethod as any;
  if (query.customerId) where.customerId = query.customerId;
  return where;
}

function receiptWhere(query: ReceiptsReportQuery & { toEnd: Date }): Prisma.ReceiptWhereInput {
  const where: Prisma.ReceiptWhereInput = {
    ...receiptSearchOr(query.search),
    issuedAt: { gte: query.from, lt: query.toEnd },
  };
  if (query.receiptStatus) where.status = query.receiptStatus as any;
  if (query.customerId) where.customerId = query.customerId;
  if (query.paymentMethod) (where as any).payment = { paymentMethod: query.paymentMethod };
  return where;
}

// ── Orders Report ──────────────────────────────────────────────────

export function orderSelect() {
  return {
    id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true,
    customerId: true, customer: { select: { name: true } },
    _count: { select: { items: true } },
    invoice: {
      select: {
        id: true, totalAmount: true, status: true,
        allocations: { select: { amount: true, payment: { select: { status: true } } } },
      },
    },
  } as const;
}

export async function findOrdersForReport(
  query: OrdersReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  return client.order.findMany({
    where: orderWhere(query),
    orderBy: { createdAt: 'desc' },
    select: orderSelect(),
  });
}

// ── Top Orders ─────────────────────────────────────────────────────

export async function findTopOrders(
  query: TopOrdersQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  const where: Prisma.OrderWhereInput = {
    ...searchOr(query.search, [{ orderNumber: { contains: query.search! } }, { customer: { name: { contains: query.search! } } }]),
    createdAt: { gte: query.from, lt: query.toEnd },
    status: { not: 'CANCELLED' },
  };
  return client.order.findMany({
    where,
    orderBy: { totalAmount: 'desc' },
    take: query.limit ?? 10,
    select: orderSelect(),
  });
}

// ── Top Customers by Approved Payments ────────────────────────────

export async function findTopCustomersPaymentAgg(
  query: TopCustomersQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  const allocs = await client.customerPaymentAllocation.findMany({
    where: {
      payment: { status: 'APPROVED', approvedAt: { gte: query.from, lt: query.toEnd } },
    },
    select: {
      paymentId: true,
      amount: true,
      payment: { select: { customerId: true, customer: { select: { name: true } } } },
    },
  });

  const custMap = new Map<string, { name: string; received: Prisma.Decimal; paymentIds: Set<string> }>();
  for (const a of allocs) {
    const cid = a.payment.customerId;
    const entry = custMap.get(cid) ?? { name: a.payment.customer.name, received: new Prisma.Decimal(0), paymentIds: new Set() };
    entry.received = entry.received.add(a.amount);
    entry.paymentIds.add(a.paymentId);
    custMap.set(cid, entry);
  }

  let sorted = [...custMap.entries()]
    .sort((a, b) => Number(b[1].received) - Number(a[1].received));

  // Apply search filter
  if (query.search) {
    const q = query.search.toLowerCase();
    sorted = sorted.filter(([, data]) => data.name.toLowerCase().includes(q));
  }

  sorted = sorted.slice(0, query.limit ?? 10);

  return { sorted, from: query.from, toEnd: query.toEnd };
}

export async function findCustomerInvoiceAgg(
  customerIds: string[],
  from: Date,
  toEnd: Date,
  client: DbClient = getPrisma(),
) {
  return client.invoice.groupBy({
    by: ['customerId'],
    where: { customerId: { in: customerIds }, status: 'ISSUED', createdAt: { gte: from, lt: toEnd } },
    _sum: { totalAmount: true },
    _count: { id: true },
  });
}

/** Returns all-time outstanding INCLUDING opening balance for each customer. */
export async function findCustomerAllTimeOutstandingWithOpenings(
  customerIds: string[],
  client: DbClient = getPrisma(),
) {
  const [invoices, openings] = await Promise.all([
    client.invoice.findMany({
      where: { customerId: { in: customerIds }, status: 'ISSUED' },
      select: {
        customerId: true, totalAmount: true,
        allocations: { select: { amount: true, payment: { select: { status: true } } } },
      },
    }),
    client.customerOpeningBalance.findMany({
      where: { customerId: { in: customerIds } },
      select: { customerId: true, amount: true },
    }),
  ]);
  const map = new Map<string, Prisma.Decimal>();
  // Start with opening balances
  for (const o of openings) {
    map.set(o.customerId, o.amount);
  }
  // Add invoiced minus approved
  for (const inv of invoices) {
    const approved = inv.allocations.filter(a => a.payment.status === 'APPROVED').reduce((s, a) => s.add(a.amount), new Prisma.Decimal(0));
    const existing = map.get(inv.customerId) ?? new Prisma.Decimal(0);
    map.set(inv.customerId, existing.add(inv.totalAmount).sub(approved));
  }
  return map;
}

// ── Customer Balances ──────────────────────────────────────────────

export async function findAllCustomerBalances(
  query: CustomerBalancesQuery,
  client: DbClient = getPrisma(),
) {
  const where: Prisma.CustomerWhereInput = { isActive: true };
  if (query.search) {
    const q = query.search;
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  return client.customer.findMany({
    where,
    select: {
      id: true, name: true, phone: true,
      openingBalance: { select: { amount: true } },
      invoices: {
        where: { status: 'ISSUED' },
        select: {
          totalAmount: true,
          allocations: { select: { amount: true, payment: { select: { status: true } } } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

// ── Invoices Report ────────────────────────────────────────────────

export async function findInvoicesForReport(
  query: InvoicesReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  return client.invoice.findMany({
    where: invoiceWhere(query),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, invoiceNumber: true, status: true, totalAmount: true, createdAt: true,
      customerId: true, customer: { select: { name: true } },
      orderId: true, order: { select: { orderNumber: true } },
      allocations: { select: { amount: true, payment: { select: { status: true } } } },
    },
  });
}

// ── Payments Report ────────────────────────────────────────────────

export async function findPaymentsForReport(
  query: PaymentsReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  return client.customerPayment.findMany({
    where: paymentWhere(query),
    orderBy: { paymentDate: 'desc' },
    select: {
      id: true, paymentNumber: true, amount: true, paymentMethod: true,
      paymentReference: true, status: true, paymentDate: true,
      customerId: true, customer: { select: { name: true } },
      evidenceStoredFileId: true,
      receipt: { select: { receiptNumber: true } },
      allocations: { select: { invoice: { select: { invoiceNumber: true } } } },
    },
  });
}

// ── Receipts Report ────────────────────────────────────────────────

export async function findReceiptsForReport(
  query: ReceiptsReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  return client.receipt.findMany({
    where: receiptWhere(query),
    orderBy: { issuedAt: 'desc' },
    select: {
      id: true, receiptNumber: true, amount: true, status: true, issuedAt: true,
      customerId: true, customer: { select: { name: true } },
      payment: {
        select: {
          paymentNumber: true, paymentMethod: true,
          allocations: { select: { invoice: { select: { invoiceNumber: true } } }, take: 1 },
        },
      },
    },
  });
}
