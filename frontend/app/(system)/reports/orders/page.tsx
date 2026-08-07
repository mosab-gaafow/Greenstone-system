'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { ReportKpiCard } from '@/components/shared/report-kpi-card';
import { ReportFilterPanel } from '@/components/shared/report-filter-panel';
import { ReportTableToolbar } from '@/components/shared/report-table-toolbar';
import { useOrdersReport } from '@/features/reports/hooks/use-reports';

const FULFILLMENT_STATUSES = ['All', 'PENDING', 'IN_PRODUCTION', 'CURING', 'READY_FOR_DELIVERY', 'PARTIALLY_DELIVERED', 'COMPLETED', 'CANCELLED'];
const PAYMENT_STATUSES = ['All', 'Fully paid', 'Partially paid', 'Unpaid'];

export default function OrdersReportPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const [fulfillmentStatus, setFulfillmentStatus] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');

  const q = useOrdersReport({ ...range, search: search || undefined, orderStatus: fulfillmentStatus !== 'All' ? fulfillmentStatus : undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;
  const rows = d?.rows.filter(r => paymentStatus === 'All' || r.paymentStatus === paymentStatus) ?? [];

  const exportParams = { from: range.from, to: range.to, search: search || undefined, orderStatus: fulfillmentStatus !== 'All' ? fulfillmentStatus : undefined };
  function clearAll() { setSearch(''); setFulfillmentStatus('All'); setPaymentStatus('All'); }

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
      {/* A. Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold tracking-tight">Orders Report</h1>
          <p className="text-xs text-muted-foreground">All orders with status, customer, and value. {d?.periodLabel ?? ''}</p>
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
      </div>

      {/* B. KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard label="Orders" value={d?.summary.orderCount ?? 0} tone="blue" />
        <ReportKpiCard label="Total value" value={`KES ${Number(d?.summary.totalValue ?? 0).toLocaleString()}`} tone="blue" />
        <ReportKpiCard label="Total paid" value={`KES ${Number(d?.summary.totalPaid ?? 0).toLocaleString()}`} tone="green" />
        <ReportKpiCard label="Outstanding" value={`KES ${Number(d?.summary.totalOutstanding ?? 0).toLocaleString()}`} tone="red" />
      </div>

      {/* D. Filter panel */}
      <ReportFilterPanel onClear={clearAll}>
        <select className="h-8 rounded-md border bg-background px-2 text-xs" value={fulfillmentStatus} onChange={e => setFulfillmentStatus(e.target.value)}>
          {FULFILLMENT_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'Fulfillment: All' : s.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="h-8 rounded-md border bg-background px-2 text-xs" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'Payment: All' : s}</option>)}
        </select>
        <ReportFilterSheet filters={filters} />
      </ReportFilterPanel>

      {/* E. Table toolbar + table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b">
          <ReportTableToolbar
            source="reports/orders" params={exportParams} fileName="Orders_Report"
            searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search orders…"
            rowCount={rows.length}
          />
        </div>
        <div className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th className="p-2.5">Order</th><th className="p-2.5">Date</th><th className="p-2.5">Customer</th>
                    <th className="p-2.5 text-center">Items</th><th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-right">Paid</th><th className="p-2.5 text-right">Outstanding</th>
                    <th className="p-2.5">Payment</th><th className="p-2.5">Fulfillment</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.orderId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-2.5"><Link href={`/orders/${o.orderId}`} className="text-primary hover:underline text-xs font-medium">{o.orderNumber}</Link></td>
                      <td className="p-2.5 text-xs whitespace-nowrap text-muted-foreground">{new Date(o.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                      <td className="p-2.5"><Link href={`/customers/${o.customerId}`} className="text-primary hover:underline text-xs">{o.customerName}</Link></td>
                      <td className="p-2.5 text-xs text-center">{o.itemCount}</td>
                      <td className="p-2.5 text-right text-xs tabular-nums font-medium">KES {Number(o.total).toLocaleString()}</td>
                      <td className="p-2.5 text-right text-xs tabular-nums text-green-600">KES {Number(o.amountPaid).toLocaleString()}</td>
                      <td className="p-2.5 text-right text-xs tabular-nums text-red-600">KES {Number(o.outstanding).toLocaleString()}</td>
                      <td className="p-2.5 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${o.paymentStatus === 'Fully paid' ? 'bg-green-100 text-green-700' : o.paymentStatus === 'Partially paid' ? 'bg-amber-100 text-amber-700' : o.paymentStatus === 'VOIDED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{o.paymentStatus}</span></td>
                      <td className="p-2.5 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${o.fulfillmentStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' : o.fulfillmentStatus === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{o.fulfillmentStatus.replace(/_/g, ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold text-xs">
                    <td className="p-2.5" colSpan={4}>Totals</td>
                    <td className="p-2.5 text-right tabular-nums">KES {rows.reduce((s, o) => s + Number(o.total), 0).toLocaleString()}</td>
                    <td className="p-2.5 text-right tabular-nums text-green-600">KES {rows.reduce((s, o) => s + Number(o.amountPaid), 0).toLocaleString()}</td>
                    <td className="p-2.5 text-right tabular-nums text-red-600">KES {rows.reduce((s, o) => s + Number(o.outstanding), 0).toLocaleString()}</td>
                    <td className="p-2.5" colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="p-6 text-sm text-muted-foreground text-center">No orders found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
