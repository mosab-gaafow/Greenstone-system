import { Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey } from '../../shared/cache/cache-keys.js';
import type { DashboardData, DashboardQuery } from './dashboard.types.js';

const CACHE_MODULE = 'dashboard';
const TTL = 30;

function safeKey(d: Date) { return d.toISOString().replace(/[:.]/g, '-'); }

export async function getDashboard(query: DashboardQuery): Promise<DashboardData> {
  const key = `${safeKey(query.from)}_${safeKey(query.to)}`;
  return cache.getOrSet(buildCacheKey({ module: CACHE_MODULE, resource: 'full', identifier: key }), TTL, async () => {
    const p = getPrisma();
    const { from, to } = query;
    const toEnd = new Date(to); toEnd.setDate(toEnd.getDate() + 1);
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / 86400000);
    const useMonths = daysDiff > 60;
    const ck = (d: Date) => useMonths ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : d.toISOString().split('T')[0]!;

    // ---- KPIs ----
    const [activeOrders, pendingDeliveries, overdueInvoices, rawReorder, pendingPayments, pendingSalaries, creditCount] = await Promise.all([
      p.order.count({ where: { status: { not: 'CANCELLED' } } }),
      p.delivery.count({ where: { status: 'PLANNED' } }),
      p.invoice.count({ where: { status: 'ISSUED', dueDate: { lt: new Date() } } }),
      p.rawMaterial.count({ where: { reorderLevel: { not: null } } }),
      p.customerPayment.count({ where: { status: 'PENDING' } }),
      p.salary.count({ where: { status: 'PENDING' } }),
      p.customerOpeningBalance.count({ where: { amount: { gt: 0 } } }),
    ]);

    // Total finished stock (sum of all finished_stock_balances physicalQuantity)
    const stockAgg = await p.finishedStockBalance.aggregate({ _sum: { physicalQuantity: true } });
    const totalFinishedStock = Number(stockAgg._sum.physicalQuantity ?? 0);

    // Stock by product
    const stockBalances = await p.finishedStockBalance.findMany({
      include: { product: { select: { name: true } } },
      orderBy: { physicalQuantity: 'desc' },
    });
    const stockByProduct = stockBalances.map((s) => ({
      name: s.product.name,
      physical: s.physicalQuantity,
      reserved: s.reservedQuantity,
      available: s.availableQuantity,
    }));

    // ---- Financial ----
    const [invRes, payRes, expRes, allInvRes, allPayRes, openRes] = await Promise.all([
      p.invoice.aggregate({ where: { status: 'ISSUED', createdAt: { gte: from, lt: toEnd } }, _sum: { totalAmount: true } }),
      p.customerPaymentAllocation.aggregate({ where: { payment: { status: 'APPROVED', approvedAt: { gte: from, lt: toEnd } } }, _sum: { amount: true } }),
      p.expense.aggregate({ where: { expenseDate: { gte: from, lt: toEnd } }, _sum: { amount: true } }),
      p.invoice.aggregate({ where: { status: 'ISSUED' }, _sum: { totalAmount: true } }),
      p.customerPaymentAllocation.aggregate({ where: { payment: { status: 'APPROVED' } }, _sum: { amount: true } }),
      p.customerOpeningBalance.aggregate({ _sum: { amount: true } }),
    ]);
    const opening = openRes._sum.amount ?? new Prisma.Decimal(0);
    const outstanding = opening.add(allInvRes._sum.totalAmount ?? new Prisma.Decimal(0)).sub(allPayRes._sum.amount ?? new Prisma.Decimal(0));

    // ---- Chart: Invoices vs Payments ----
    const invChart = await p.invoice.findMany({ where: { status: 'ISSUED', createdAt: { gte: from, lt: toEnd } }, select: { totalAmount: true, createdAt: true } });
    const payChart = await p.customerPaymentAllocation.findMany({ where: { payment: { status: 'APPROVED', approvedAt: { gte: from, lt: toEnd } } }, select: { amount: true, payment: { select: { approvedAt: true } } } });
    const cm = new Map<string, { invoiced: Prisma.Decimal; received: Prisma.Decimal }>();
    for (const i of invChart) { const k = ck(i.createdAt); const e = cm.get(k) ?? { invoiced: new Prisma.Decimal(0), received: new Prisma.Decimal(0) }; e.invoiced = e.invoiced.add(i.totalAmount); cm.set(k, e); }
    for (const a of payChart) { const d = a.payment.approvedAt ?? new Date(0); const k = ck(d); const e = cm.get(k) ?? { invoiced: new Prisma.Decimal(0), received: new Prisma.Decimal(0) }; e.received = e.received.add(a.amount); cm.set(k, e); }
    const chart = [...cm.keys()].sort().map((k) => ({ label: k, invoiced: cm.get(k)!.invoiced.toFixed(2), received: cm.get(k)!.received.toFixed(2) }));

    // ---- Top 10 Orders (highest value in period) ----
    const topOrdersRes = await p.order.findMany({
      where: { createdAt: { gte: from, lt: toEnd }, status: { not: 'CANCELLED' } },
      orderBy: { totalAmount: 'desc' }, take: 10,
      select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true, customerId: true, customer: { select: { name: true } },
        invoice: { select: { id: true, totalAmount: true, allocations: { select: { amount: true, payment: { select: { status: true } } } } } },
      },
    });
    const topOrders = topOrdersRes.map((o, i) => {
      const inv = o.invoice;
      const approvedAmt = inv?.allocations?.filter((a) => a.payment.status === 'APPROVED').reduce((s, a) => s.add(a.amount), new Prisma.Decimal(0)) ?? new Prisma.Decimal(0);
      const invTotal = inv?.totalAmount ?? new Prisma.Decimal(0);
      const out = invTotal.sub(approvedAmt);
      let ps = 'Unpaid'; if (approvedAmt.gte(invTotal) && !approvedAmt.isZero()) ps = 'Fully paid'; else if (!approvedAmt.isZero()) ps = 'Partially paid';
      return { rank: i + 1, orderId: o.id, orderNumber: o.orderNumber, date: o.createdAt.toISOString(), customerId: o.customerId, customerName: o.customer.name, total: invTotal.toFixed(2), amountPaid: approvedAmt.toFixed(2), outstanding: out.toFixed(2), paymentStatus: ps, orderStatus: o.status };
    });

    // ---- Top 10 Customers by Payments in period ----
    const payByCust = await p.customerPaymentAllocation.groupBy({
      by: ['paymentId'], where: { payment: { status: 'APPROVED', approvedAt: { gte: from, lt: toEnd } } }, _sum: { amount: true },
    });
    const paymentIds = [...new Set(payByCust.map((a) => a.paymentId))];
    const payments = await p.customerPayment.findMany({ where: { id: { in: paymentIds } }, select: { id: true, customerId: true, customer: { select: { name: true } } } });
    const custPayMap = new Map<string, { count: number; received: Prisma.Decimal }>();
    for (const pc of payByCust) {
      const pmt = payments.find((pp) => pp.id === pc.paymentId); if (!pmt) continue;
      const e = custPayMap.get(pmt.customerId) ?? { count: 0, received: new Prisma.Decimal(0) };
      e.count++; e.received = e.received.add(pc._sum.amount ?? new Prisma.Decimal(0)); custPayMap.set(pmt.customerId, e);
    }
    const topCustIds = [...custPayMap.entries()].sort((a, b) => Number(b[1].received) - Number(a[1].received)).slice(0, 10).map((e) => e[0]);
    let topCustomersByPayments: { rank: number; customerId: string; customerName: string; paymentCount: number; orderCount: number; totalInvoiced: string; paymentsReceived: string; outstanding: string }[] = [];
    if (topCustIds.length > 0) {
      const custInvoices = await p.invoice.groupBy({ by: ['customerId'], where: { customerId: { in: topCustIds }, status: 'ISSUED', createdAt: { gte: from, lt: toEnd } }, _sum: { totalAmount: true }, _count: { id: true } });
      const allInvForCusts = await p.invoice.findMany({ where: { customerId: { in: topCustIds }, status: 'ISSUED' }, select: { id: true, customerId: true, totalAmount: true, allocations: { select: { amount: true, payment: { select: { status: true } } } } } });
      const custOutMap = new Map<string, Prisma.Decimal>();
      for (const inv of allInvForCusts) {
        const app = inv.allocations.filter((a) => a.payment.status === 'APPROVED').reduce((s, a) => s.add(a.amount), new Prisma.Decimal(0));
        custOutMap.set(inv.customerId, (custOutMap.get(inv.customerId) ?? new Prisma.Decimal(0)).add(inv.totalAmount).sub(app));
      }
      const custMap = new Map(payments.map((p) => [p.customerId, p.customer.name]));
      const custInvMap = new Map(custInvoices.map((c) => [c.customerId, { total: c._sum.totalAmount ?? new Prisma.Decimal(0), count: c._count.id }]));
      topCustomersByPayments = [...custPayMap.entries()].sort((a, b) => Number(b[1].received) - Number(a[1].received)).slice(0, 10).map(([cid, data], i) => {
        const inv = custInvMap.get(cid);
        return { rank: i + 1, customerId: cid, customerName: custMap.get(cid) ?? '', paymentCount: data.count, orderCount: inv?.count ?? 0, totalInvoiced: (inv?.total ?? new Prisma.Decimal(0)).toFixed(2), paymentsReceived: data.received.toFixed(2), outstanding: (custOutMap.get(cid) ?? new Prisma.Decimal(0)).toFixed(2) };
      });
    }

    // ---- Invoice payment status ----
    const allInv = await p.invoice.findMany({ where: { status: 'ISSUED' }, select: { id: true, totalAmount: true, allocations: { select: { amount: true, payment: { select: { status: true } } } } } });
    let fullyPaid = 0, partiallyPaid = 0, unpaid = 0;
    for (const inv of allInv) {
      const approved = inv.allocations.filter((a) => a.payment.status === 'APPROVED').reduce((s, a) => s.add(a.amount), new Prisma.Decimal(0));
      if (approved.isZero()) unpaid++; else if (approved.gte(inv.totalAmount)) fullyPaid++; else partiallyPaid++;
    }

    return {
      kpis: { activeOrders, pendingDeliveries, overdueInvoices, lowStockMaterials: rawReorder, totalFinishedStock, pendingPayments, pendingSalaryApprovals: pendingSalaries, customersWithCredit: creditCount },
      financialSummary: {
        totalInvoiced: (invRes._sum.totalAmount ?? new Prisma.Decimal(0)).toFixed(2),
        paymentsReceived: (payRes._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        outstandingAmount: outstanding.toFixed(2),
        totalExpenses: (expRes._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      },
      chart, stockByProduct, topOrders, topCustomersByPayments,
      invoiceStatus: { fullyPaid, partiallyPaid, unpaid },
      periodLabel: `${from.toISOString().split('T')[0]} – ${to.toISOString().split('T')[0]}`,
    };
  });
}
