/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type {
  OrdersReportQuery, InvoicesReportQuery, PaymentsReportQuery,
  ReceiptsReportQuery, TopOrdersQuery, TopCustomersQuery,
  CustomerBalancesQuery,
  ProductionReportQuery, CuringReportQuery, DeliveriesReportQuery,
  StockMovementQuery,
  PurchasesReportQuery, PurchasePaymentsReportQuery, SuppliersReportQuery,
  ExpensesReportQuery, SalariesReportQuery, OutstandingInvoicesQuery,
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

// ── Phase 11C2: Production ────────────────────────────────────────

export async function findProductionBatches(
  query: ProductionReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  const where: Prisma.ProductionBatchWhereInput = {
    productionDate: { gte: query.from, lt: query.toEnd },
  };
  if (query.status) where.status = query.status as any;
  if (query.search) {
    where.OR = [
      { productionNumber: { contains: query.search } },
      { order: { orderNumber: { contains: query.search } } },
    ] as any;
  }
  return client.productionBatch.findMany({
    where,
    orderBy: { productionDate: 'desc' },
    select: {
      id: true, productionNumber: true, productionDate: true, purpose: true, status: true,
      order: { select: { orderNumber: true } },
      _count: { select: { items: true } },
      items: { select: { producedQuantity: true, brokenQuantity: true, usableQuantity: true } },
    },
  });
}

// ── Phase 11C2: Curing ────────────────────────────────────────────

export async function findCuringRecords(
  query: CuringReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  const where: Prisma.CuringRecordWhereInput = {
    startedAt: { gte: query.from, lt: query.toEnd },
  };
  if (query.productId) where.productionItem = { productId: query.productId };
  return client.curingRecord.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    select: {
      id: true, productionBatchId: true, quantityEntering: true,
      currentDuration: true, startedAt: true, plannedCompletion: true,
      actualRelease: true, brokenQuantity: true, releasedQuantity: true,
      productionItem: {
        select: {
          product: { select: { id: true, name: true } },
          productionBatch: { select: { productionNumber: true } },
        },
      },
    },
  });
}

// ── Phase 11C2: Deliveries ────────────────────────────────────────

export async function findDeliveriesForReport(
  query: DeliveriesReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  const where: Prisma.DeliveryWhereInput = {
    deliveryDate: { gte: query.from, lt: query.toEnd },
  };
  if (query.status) where.status = query.status as any;
  if (query.search) {
    where.OR = [
      { deliveryNumber: { contains: query.search } },
      { order: { orderNumber: { contains: query.search } } },
      { customer: { name: { contains: query.search } } },
    ] as any;
  }
  return client.delivery.findMany({
    where,
    orderBy: { deliveryDate: 'desc' },
    select: {
      id: true, deliveryNumber: true, deliveryDate: true, status: true,
      totalTransportCost: true,
      order: { select: { orderNumber: true } },
      customer: { select: { name: true } },
      driver: { select: { name: true } },
      vehicle: { select: { registrationNumber: true } },
      _count: { select: { items: true } },
      items: { select: { plannedQuantity: true, dispatchedQuantity: true, deliveredQuantity: true } },
    },
  });
}

// ── Phase 11C2: Stock ─────────────────────────────────────────────

export async function findFinishedStockBalances(
  search: string | undefined,
  client: DbClient = getPrisma(),
) {
  const where: Prisma.FinishedStockBalanceWhereInput = { physicalQuantity: { gt: 0 } };
  if (search) where.product = { name: { contains: search } };
  return client.finishedStockBalance.findMany({
    where,
    orderBy: { physicalQuantity: 'desc' },
    select: {
      productId: true, physicalQuantity: true, reservedQuantity: true, availableQuantity: true,
      product: { select: { name: true } },
    },
  });
}

export async function findReservedStockBalances(
  search: string | undefined,
  client: DbClient = getPrisma(),
) {
  const where: Prisma.FinishedStockBalanceWhereInput = { reservedQuantity: { gt: 0 } };
  if (search) where.product = { name: { contains: search } };
  return client.finishedStockBalance.findMany({
    where,
    orderBy: { reservedQuantity: 'desc' },
    select: {
      productId: true, physicalQuantity: true, reservedQuantity: true, availableQuantity: true,
      product: { select: { name: true } },
    },
  });
}

export async function findAvailableStockBalances(
  search: string | undefined,
  client: DbClient = getPrisma(),
) {
  const where: Prisma.FinishedStockBalanceWhereInput = { availableQuantity: { gt: 0 } };
  if (search) where.product = { name: { contains: search } };
  return client.finishedStockBalance.findMany({
    where,
    orderBy: { availableQuantity: 'desc' },
    select: {
      productId: true, physicalQuantity: true, reservedQuantity: true, availableQuantity: true,
      product: { select: { name: true } },
    },
  });
}

export async function findLowStockProducts(
  search: string | undefined,
  client: DbClient = getPrisma(),
) {
  const products = await (client as any).product.findMany({
    where: {
      isActive: true,
      reorderLevel: { not: null },
      ...(search ? { name: { contains: search } } : {}),
    },
    select: {
      id: true, name: true, reorderLevel: true,
      finishedStockBalance: {
        select: { physicalQuantity: true, reservedQuantity: true, availableQuantity: true },
      },
    },
    orderBy: { name: 'asc' },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (products as any[]).filter((p: any) => p.finishedStockBalance && p.finishedStockBalance.physicalQuantity <= (p.reorderLevel ?? 0))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({
      productId: p.id,
      productName: p.name,
      physicalQuantity: p.finishedStockBalance!.physicalQuantity,
      reservedQuantity: p.finishedStockBalance!.reservedQuantity,
      availableQuantity: p.finishedStockBalance!.availableQuantity,
      reorderLevel: p.reorderLevel!,
    }));
}

export async function findStockMovements(
  query: StockMovementQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  const where: Prisma.FinishedStockMovementWhereInput = {
    createdAt: { gte: query.from, lt: query.toEnd },
  };
  if (query.movementType) where.movementType = query.movementType as any;
  return client.finishedStockMovement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, movementType: true, quantity: true, balanceAfter: true,
      reason: true, relatedEntityId: true, createdAt: true,
      product: { select: { name: true } },
    },
  });
}

// ── Phase 11C3: Purchases ─────────────────────────────────────────

export async function findPurchasesForReport(
  query: PurchasesReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  const where: Prisma.PurchaseWhereInput = { purchaseDate: { gte: query.from, lt: query.toEnd } };
  if (query.supplierId) where.supplierId = query.supplierId;
  if (query.search) {
    where.OR = [{ purchaseNumber: { contains: query.search } }, { supplier: { name: { contains: query.search } } }] as any;
  }
  return client.purchase.findMany({
    where, orderBy: { purchaseDate: 'desc' },
    select: {
      id: true, purchaseNumber: true, purchaseDate: true, totalCost: true, reference: true,
      supplierId: true, supplier: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function findPurchasePaymentsForReport(
  query: PurchasePaymentsReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  const where: Prisma.PurchasePaymentWhereInput = { paymentDate: { gte: query.from, lt: query.toEnd } };
  if (query.supplierId) where.supplierId = query.supplierId;
  if (query.status) where.status = query.status as any;
  if (query.paymentMethod) where.paymentMethod = query.paymentMethod as any;
  if (query.search) {
    where.OR = [{ paymentNumber: { contains: query.search } }, { supplier: { name: { contains: query.search } } }, { paymentReference: { contains: query.search } }] as any;
  }
  return client.purchasePayment.findMany({
    where, orderBy: { paymentDate: 'desc' },
    select: {
      id: true, paymentNumber: true, amount: true, paymentMethod: true,
      paymentReference: true, status: true, paymentDate: true, evidenceStoredFileId: true,
      supplierId: true, supplier: { select: { name: true } },
      allocations: { select: { purchase: { select: { purchaseNumber: true } } } },
    },
  });
}

export async function findSuppliersForReport(
  query: SuppliersReportQuery,
  client: DbClient = getPrisma(),
) {
  const where: Prisma.SupplierWhereInput = { isActive: true };
  if (query.search) {
    where.OR = [{ name: { contains: query.search } }, { phone: { contains: query.search } }] as any;
  }
  return client.supplier.findMany({
    where, orderBy: { name: 'asc' },
    select: {
      id: true, name: true, phone: true,
      openingBalance: { select: { amount: true } },
      purchases: { select: { totalCost: true } },
      purchasePayments: { where: { status: 'APPROVED' }, select: { amount: true } },
    },
  });
}

// ── Phase 11C4: Expenses ──────────────────────────────────────────

export async function findExpensesForReport(
  query: ExpensesReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  const where: Prisma.ExpenseWhereInput = { expenseDate: { gte: query.from, lt: query.toEnd } };
  if (query.category) where.category = query.category as any;
  if (query.search) {
    where.OR = [{ expenseNumber: { contains: query.search } }, { description: { contains: query.search } }] as any;
  }
  return client.expense.findMany({
    where, orderBy: { expenseDate: 'desc' },
    select: { id: true, expenseNumber: true, category: true, description: true, amount: true, paymentMethod: true, paymentReference: true, expenseDate: true, evidenceStoredFileId: true },
  });
}

// ── Phase 11C4: Salaries ──────────────────────────────────────────

export async function findSalariesForReport(
  query: SalariesReportQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  // Include salaries whose period overlaps the selected date range.
  // periodStart <= rangeEnd AND periodEnd >= rangeFrom
  const where: Prisma.SalaryWhereInput = {
    periodStart: { lte: query.toEnd },
    periodEnd: { gte: query.from },
  };
  if (query.salaryType) where.salaryType = query.salaryType as any;
  if (query.status) where.status = query.status as any;
  if (query.search) {
    where.OR = [{ salaryNumber: { contains: query.search } }, { employee: { name: { contains: query.search } } }] as any;
  }
  return client.salary.findMany({
    where, orderBy: { periodStart: 'desc' },
    select: { id: true, salaryNumber: true, salaryType: true, periodStart: true, periodEnd: true, amount: true, paymentMethod: true, status: true, paymentDate: true,
      employeeId: true, employee: { select: { name: true } },
    },
  });
}

// ── Phase 11C4: Outstanding Invoices ──────────────────────────────

export async function findOutstandingInvoices(
  query: OutstandingInvoicesQuery & { toEnd: Date },
  client: DbClient = getPrisma(),
) {
  const where: Prisma.InvoiceWhereInput = {
    status: 'ISSUED',
    createdAt: { gte: query.from, lt: query.toEnd },
  };
  if (query.search) {
    where.OR = [{ invoiceNumber: { contains: query.search } }, { order: { orderNumber: { contains: query.search } } }, { customer: { name: { contains: query.search } } }] as any;
  }
  return client.invoice.findMany({
    where, orderBy: { createdAt: 'desc' },
    select: { id: true, invoiceNumber: true, status: true, totalAmount: true, createdAt: true,
      customerId: true, customer: { select: { name: true } },
      orderId: true, order: { select: { orderNumber: true } },
      allocations: { select: { amount: true, payment: { select: { status: true } } } },
    },
  });
}
