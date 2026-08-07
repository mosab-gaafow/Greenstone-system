'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { useOutstandingInvoicesReport } from '@/features/reports/hooks/use-reports';

const PAYMENT_STATUSES = ['All', 'Unpaid', 'Partially paid'];

export default function OutstandingInvoicesPage() {
  const { range, filters } = useReportFilters('year');
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const q = useOutstandingInvoicesReport({ ...range, search: search || undefined, paymentStatus: paymentStatus !== 'All' ? paymentStatus : undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Outstanding Invoices Report</h1>
          <p className="text-xs text-muted-foreground">ISSUED invoices with outstanding balances. VOIDED excluded. {d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search invoice, order, or customer…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-card px-2 text-xs" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All payment statuses' : s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding inv.</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-12" /> : <span className="text-lg font-bold tabular-nums">{d?.summary.invoiceCount ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Total invoiced</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums">KES {Number(d?.summary.totalInvoiced ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Total paid</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-green-600">KES {Number(d?.summary.totalPaid ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Total outstanding</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-red-600">KES {Number(d?.summary.totalOutstanding ?? 0).toLocaleString()}</span>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Invoices with outstanding balances</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Invoice</th><th className="p-2.5">Date</th><th className="p-2.5">Customer</th><th className="p-2.5">Order</th><th className="p-2.5 text-right">Total</th><th className="p-2.5 text-right">Paid</th><th className="p-2.5 text-right">Outstanding</th><th className="p-2.5">Payment</th></tr></thead>
              <tbody>{d.rows.map((inv) => (
                <tr key={inv.invoiceId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-2.5"><Link href={`/invoices/${inv.invoiceId}`} className="text-primary hover:underline text-xs font-medium">{inv.invoiceNumber}</Link></td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5"><Link href={`/customers/${inv.customerId}`} className="text-primary hover:underline text-xs">{inv.customerName}</Link></td>
                  <td className="p-2.5"><Link href={`/orders/${inv.orderId}`} className="text-primary hover:underline text-xs">{inv.orderNumber}</Link></td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(inv.total).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">KES {Number(inv.amountPaid).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">KES {Number(inv.outstanding).toLocaleString()}</td>
                  <td className="p-2.5 text-xs"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${inv.paymentStatus === 'Unpaid' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-700'}`}>{inv.paymentStatus}</span></td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="border-t-2 bg-muted/30 font-medium text-xs"><td className="p-2.5" colSpan={4}>Totals</td><td className="p-2.5 text-right tabular-nums">KES {d.rows.reduce((s, i) => s + Number(i.total), 0).toLocaleString()}</td><td className="p-2.5 text-right tabular-nums text-green-600">KES {d.rows.reduce((s, i) => s + Number(i.amountPaid), 0).toLocaleString()}</td><td className="p-2.5 text-right tabular-nums text-red-600">KES {d.rows.reduce((s, i) => s + Number(i.outstanding), 0).toLocaleString()}</td><td className="p-2.5" /></tr></tfoot>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No outstanding invoices found for this period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
