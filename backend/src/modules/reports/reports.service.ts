import { Prisma } from '../../generated/prisma/client.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey } from '../../shared/cache/cache-keys.js';
import * as repo from './reports.repository.js';
import type {
  OrdersReportQuery, OrdersReportResult, TopOrdersQuery, TopOrdersResult,
  TopCustomersQuery, TopCustomersResult,
  CustomerBalancesQuery, CustomerBalancesResult, CustomerBalanceRow,
  InvoicesReportQuery, InvoicesReportResult,
  PaymentsReportQuery, PaymentsReportResult,
  ReceiptsReportQuery, ReceiptsReportResult,
} from './reports.types.js';

const CACHE_MODULE = 'reports';
const TTL = 30;
function safeKey(d: Date) { return d.toISOString().replace(/[:.]/g, '-'); }
function addDay(d: Date) { const e = new Date(d); e.setDate(e.getDate() + 1); return e; }
function label(from: Date, to: Date) { return `${from.toISOString().split('T')[0]} – ${to.toISOString().split('T')[0]}`; }

/**
 * Compute approved amount, outstanding, and payment status for an invoice.
 *
 * VOIDED invoices: outstanding is always 0 — they do not contribute to
 * valid receivables or customer balances.
 */
function computeInvoiceFinance(inv: {
  totalAmount: Prisma.Decimal;
  status: string;
  allocations: { amount: Prisma.Decimal; payment: { status: string } }[];
}): { approved: Prisma.Decimal; outstanding: Prisma.Decimal; paymentStatus: string } {
  // VOIDED invoices never have valid outstanding
  if (inv.status === 'VOIDED') {
    return { approved: new Prisma.Decimal(0), outstanding: new Prisma.Decimal(0), paymentStatus: 'VOIDED' };
  }

  let approved = new Prisma.Decimal(0);
  for (const a of inv.allocations) {
    if (a.payment.status === 'APPROVED') approved = approved.add(a.amount);
  }
  const out = inv.totalAmount.sub(approved);
  let ps = 'Unpaid';
  if (out.isZero() || out.isNegative()) {
    if (approved.isZero()) ps = 'Unpaid';
    else ps = 'Fully paid';
  } else if (!approved.isZero()) ps = 'Partially paid';
  return { approved, outstanding: out, paymentStatus: ps };
}

// ── Orders Report ──────────────────────────────────────────────────

export async function ordersReport(query: OrdersReportQuery): Promise<OrdersReportResult> {
  const key = `orders_${safeKey(query.from)}_${safeKey(query.to)}_${query.search ?? ''}_${query.customerId ?? ''}_${query.orderStatus ?? ''}`;
  return cache.getOrSet(buildCacheKey({ module: CACHE_MODULE, resource: 'orders', identifier: key }), TTL, async () => {
    const rows = await repo.findOrdersForReport({ ...query, toEnd: addDay(query.to) });
    let totalValue = new Prisma.Decimal(0), totalPaid = new Prisma.Decimal(0), totalOutstanding = new Prisma.Decimal(0);
    const mapped = rows.map(r => {
      const inv = r.invoice;
      const fin = computeInvoiceFinance(inv ?? { totalAmount: r.totalAmount, status: 'ISSUED', allocations: [] });
      const t = inv?.totalAmount ?? r.totalAmount;
      totalValue = totalValue.add(t);
      totalPaid = totalPaid.add(fin.approved);
      totalOutstanding = totalOutstanding.add(fin.outstanding);
      return {
        orderId: r.id, orderNumber: r.orderNumber,
        date: r.createdAt.toISOString(),
        customerId: r.customerId, customerName: r.customer.name,
        itemCount: r._count.items,
        total: t.toFixed(2), amountPaid: fin.approved.toFixed(2),
        outstanding: fin.outstanding.toFixed(2),
        paymentStatus: fin.paymentStatus, fulfillmentStatus: r.status,
      };
    });
    return { rows: mapped, summary: { orderCount: rows.length, totalValue: totalValue.toFixed(2), totalPaid: totalPaid.toFixed(2), totalOutstanding: totalOutstanding.toFixed(2) }, periodLabel: label(query.from, query.to) };
  });
}

// ── Top Orders ─────────────────────────────────────────────────────

export async function topOrdersReport(query: TopOrdersQuery): Promise<TopOrdersResult> {
  const key = `toporders_${safeKey(query.from)}_${safeKey(query.to)}_${query.search ?? ''}_${query.limit ?? 10}`;
  return cache.getOrSet(buildCacheKey({ module: CACHE_MODULE, resource: 'top-orders', identifier: key }), TTL, async () => {
    const rows = await repo.findTopOrders({ ...query, toEnd: addDay(query.to) });
    const mapped = rows.map((r, i) => {
      const inv = r.invoice;
      const fin = computeInvoiceFinance(inv ?? { totalAmount: r.totalAmount, status: 'ISSUED', allocations: [] });
      return {
        rank: i + 1,
        orderId: r.id, orderNumber: r.orderNumber,
        date: r.createdAt.toISOString(),
        customerId: r.customerId, customerName: r.customer.name,
        total: (inv?.totalAmount ?? r.totalAmount).toFixed(2),
        amountPaid: fin.approved.toFixed(2),
        outstanding: fin.outstanding.toFixed(2),
        paymentStatus: fin.paymentStatus, fulfillmentStatus: r.status,
      };
    });
    return { rows: mapped, periodLabel: label(query.from, query.to) };
  });
}

// ── Top Customers ──────────────────────────────────────────────────

export async function topCustomersReport(query: TopCustomersQuery): Promise<TopCustomersResult> {
  const key = `topcust_${safeKey(query.from)}_${safeKey(query.to)}_${query.search ?? ''}_${query.limit ?? 10}`;
  return cache.getOrSet(buildCacheKey({ module: CACHE_MODULE, resource: 'top-customers', identifier: key }), TTL, async () => {
    const { sorted, from, toEnd } = await repo.findTopCustomersPaymentAgg({ ...query, toEnd: addDay(query.to) });
    if (sorted.length === 0) return { rows: [], periodLabel: label(query.from, query.to) };

    const cids = sorted.map(e => e[0]);
    const [invAgg, outMap] = await Promise.all([
      repo.findCustomerInvoiceAgg(cids, from, toEnd),
      repo.findCustomerAllTimeOutstandingWithOpenings(cids),
    ]);
    const invMap = new Map(invAgg.map(c => [c.customerId, { total: c._sum.totalAmount ?? new Prisma.Decimal(0), count: c._count.id }]));

    const rows = sorted.map(([cid, data], i) => {
      const inv = invMap.get(cid);
      return {
        rank: i + 1, customerId: cid, customerName: data.name,
        orderCount: inv?.count ?? 0, paymentCount: data.paymentIds.size,
        totalInvoiced: (inv?.total ?? new Prisma.Decimal(0)).toFixed(2),
        paymentsReceived: data.received.toFixed(2),
        // Uses the canonical formula: opening + issued invoices − approved payments
        outstanding: (outMap.get(cid) ?? new Prisma.Decimal(0)).toFixed(2),
      };
    });
    return { rows, periodLabel: label(query.from, query.to) };
  });
}

// ── Customer Balances ──────────────────────────────────────────────

const CREDIT_THRESHOLDS = [
  { max: 800_000, label: 'NORMAL' },
  { max: 900_000, label: 'WARNING' },
  { max: 1_000_000, label: 'STRONG_WARNING' },
] as const;

function creditStatus(outstanding: Prisma.Decimal): string {
  const n = Number(outstanding);
  for (const t of CREDIT_THRESHOLDS) { if (n < t.max) return t.label; }
  return 'BLOCKED';
}

export async function customerBalancesReport(query: CustomerBalancesQuery = {}): Promise<CustomerBalancesResult> {
  const key = `custbal_${query.search ?? ''}_${query.balanceFilter ?? 'all'}`;
  return cache.getOrSet(buildCacheKey({ module: CACHE_MODULE, resource: 'customer-balances', identifier: key }), TTL, async () => {
    const customers = await repo.findAllCustomerBalances(query);
    let totalOutstanding = new Prisma.Decimal(0);
    let rows: CustomerBalanceRow[] = customers.map(c => {
      let invTotal = new Prisma.Decimal(0), approvedPay = new Prisma.Decimal(0);
      for (const inv of c.invoices) {
        invTotal = invTotal.add(inv.totalAmount);
        for (const a of inv.allocations) { if (a.payment.status === 'APPROVED') approvedPay = approvedPay.add(a.amount); }
      }
      const opening = c.openingBalance?.amount ?? new Prisma.Decimal(0);
      const out = opening.add(invTotal).sub(approvedPay);
      totalOutstanding = totalOutstanding.add(out);
      return { customerId: c.id, customerName: c.name, phone: c.phone, openingBalance: opening.toFixed(2), totalInvoiced: invTotal.toFixed(2), approvedPayments: approvedPay.toFixed(2), outstanding: out.toFixed(2), creditStatus: creditStatus(out) };
    });

    // Post-filter by balance
    if (query.balanceFilter === 'has-outstanding') {
      rows = rows.filter(r => Number(r.outstanding) > 0);
    } else if (query.balanceFilter === 'zero-balance') {
      rows = rows.filter(r => Number(r.outstanding) === 0);
    }

    return { rows, summary: { totalOutstanding: totalOutstanding.toFixed(2), customerCount: rows.length } };
  });
}

// ── Invoices Report ────────────────────────────────────────────────

export async function invoicesReport(query: InvoicesReportQuery): Promise<InvoicesReportResult> {
  const key = `invs_${safeKey(query.from)}_${safeKey(query.to)}_${query.search ?? ''}_${query.customerId ?? ''}_${query.invoiceStatus ?? ''}_${query.paymentStatus ?? ''}`;
  return cache.getOrSet(buildCacheKey({ module: CACHE_MODULE, resource: 'invoices', identifier: key }), TTL, async () => {
    const rows = await repo.findInvoicesForReport({ ...query, toEnd: addDay(query.to) });
    let issuedValue = new Prisma.Decimal(0), amountPaid = new Prisma.Decimal(0), validOutstanding = new Prisma.Decimal(0);
    let voidedValue = new Prisma.Decimal(0), voidedCount = 0;

    let mapped = rows.map(r => {
      const fin = computeInvoiceFinance(r);
      if (r.status === 'VOIDED') {
        voidedValue = voidedValue.add(r.totalAmount);
        voidedCount++;
      } else {
        issuedValue = issuedValue.add(r.totalAmount);
        amountPaid = amountPaid.add(fin.approved);
        validOutstanding = validOutstanding.add(fin.outstanding);
      }
      return {
        invoiceId: r.id, invoiceNumber: r.invoiceNumber,
        date: r.createdAt.toISOString(),
        customerId: r.customerId, customerName: r.customer.name,
        orderId: r.orderId, orderNumber: r.order.orderNumber,
        total: r.totalAmount.toFixed(2),
        amountPaid: fin.approved.toFixed(2),
        outstanding: fin.outstanding.toFixed(2),
        invoiceStatus: r.status, paymentStatus: fin.paymentStatus,
      };
    });

    if (query.paymentStatus) {
      mapped = mapped.filter(r => r.paymentStatus.toLowerCase() === query.paymentStatus!.toLowerCase().replace('_', ' '));
    }

    return {
      rows: mapped,
      summary: {
        invoiceCount: rows.length,
        issuedValue: issuedValue.toFixed(2),
        amountPaid: amountPaid.toFixed(2),
        validOutstanding: validOutstanding.toFixed(2),
        voidedValue: voidedValue.toFixed(2),
        voidedCount,
      },
      periodLabel: label(query.from, query.to),
    };
  });
}

// ── Payments Report ────────────────────────────────────────────────

export async function paymentsReport(query: PaymentsReportQuery): Promise<PaymentsReportResult> {
  const key = `pays_${safeKey(query.from)}_${safeKey(query.to)}_${query.search ?? ''}_${query.customerId ?? ''}_${query.paymentStatus ?? ''}_${query.paymentMethod ?? ''}`;
  return cache.getOrSet(buildCacheKey({ module: CACHE_MODULE, resource: 'payments', identifier: key }), TTL, async () => {
    const rows = await repo.findPaymentsForReport({ ...query, toEnd: addDay(query.to) });
    let recordedAmount = new Prisma.Decimal(0), approvedAmount = new Prisma.Decimal(0), pendingAmount = new Prisma.Decimal(0), reversedAmount = new Prisma.Decimal(0);
    const mapped = rows.map(r => {
      const amt = r.amount;
      recordedAmount = recordedAmount.add(amt);
      if (r.status === 'APPROVED') approvedAmount = approvedAmount.add(amt);
      else if (r.status === 'PENDING') pendingAmount = pendingAmount.add(amt);
      else if (r.status === 'REVERSED') reversedAmount = reversedAmount.add(amt);
      return {
        paymentId: r.id, paymentNumber: r.paymentNumber,
        date: r.paymentDate.toISOString(),
        customerId: r.customerId, customerName: r.customer.name,
        amount: amt.toFixed(2), method: r.paymentMethod as string,
        reference: r.paymentReference, status: r.status as string,
        invoiceNumbers: r.allocations.map(a => a.invoice.invoiceNumber),
        receiptNumber: r.receipt?.receiptNumber ?? null,
        hasEvidence: r.evidenceStoredFileId !== null,
      };
    });
    return {
      rows: mapped,
      summary: {
        paymentCount: rows.length,
        recordedAmount: recordedAmount.toFixed(2),
        approvedAmount: approvedAmount.toFixed(2),
        pendingAmount: pendingAmount.toFixed(2),
        reversedAmount: reversedAmount.toFixed(2),
      },
      periodLabel: label(query.from, query.to),
    };
  });
}

// ── Receipts Report ────────────────────────────────────────────────

export async function receiptsReport(query: ReceiptsReportQuery): Promise<ReceiptsReportResult> {
  const key = `rcpts_${safeKey(query.from)}_${safeKey(query.to)}_${query.search ?? ''}_${query.customerId ?? ''}_${query.receiptStatus ?? ''}_${query.paymentMethod ?? ''}`;
  return cache.getOrSet(buildCacheKey({ module: CACHE_MODULE, resource: 'receipts', identifier: key }), TTL, async () => {
    const rows = await repo.findReceiptsForReport({ ...query, toEnd: addDay(query.to) });
    let activeAmount = new Prisma.Decimal(0), activeCount = 0;
    let voidedAmount = new Prisma.Decimal(0), voidedCount = 0;

    const mapped = rows.map(r => {
      if (r.status === 'ACTIVE') {
        activeAmount = activeAmount.add(r.amount);
        activeCount++;
      } else {
        voidedAmount = voidedAmount.add(r.amount);
        voidedCount++;
      }
      return {
        receiptId: r.id, receiptNumber: r.receiptNumber,
        date: r.issuedAt.toISOString(),
        customerId: r.customerId, customerName: r.customer.name,
        paymentNumber: r.payment.paymentNumber,
        invoiceNumber: r.payment.allocations[0]?.invoice.invoiceNumber ?? null,
        amount: r.amount.toFixed(2),
        paymentMethod: r.payment.paymentMethod,
        status: r.status,
      };
    });
    return {
      rows: mapped,
      summary: {
        receiptCount: rows.length,
        activeAmount: activeAmount.toFixed(2),
        activeCount,
        voidedAmount: voidedAmount.toFixed(2),
        voidedCount,
      },
      periodLabel: label(query.from, query.to),
    };
  });
}
