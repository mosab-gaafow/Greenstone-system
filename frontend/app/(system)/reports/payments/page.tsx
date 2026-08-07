'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Paperclip, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { usePaymentsReport } from '@/features/reports/hooks/use-reports';

const PAYMENT_STATUSES = ['All', 'APPROVED', 'PENDING', 'REVERSED'];
const PAYMENT_METHODS = ['All', 'MPESA', 'CASH', 'BANK_TRANSFER', 'CHEQUE'];

export default function PaymentsReportPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [method, setMethod] = useState('All');

  const q = usePaymentsReport({
    ...range,
    search: search || undefined,
    paymentStatus: status !== 'All' ? status : undefined,
    paymentMethod: method !== 'All' ? method : undefined,
  });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Payments Report</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search payment #, customer, or reference…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-card px-2 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All payment statuses' : s}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-card px-2 text-xs" value={method} onChange={(e) => setMethod(e.target.value)}>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m === 'All' ? 'All methods' : m.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Payments</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-12" /> : <span className="text-lg font-bold tabular-nums">{d?.summary.paymentCount ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Recorded amt</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums">KES {Number(d?.summary.recordedAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Approved</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-green-600">KES {Number(d?.summary.approvedAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-amber-600">KES {Number(d?.summary.pendingAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Reversed</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-red-600">KES {Number(d?.summary.reversedAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Payment list</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Payment</th><th className="p-2.5">Date</th><th className="p-2.5">Customer</th><th className="p-2.5 text-right">Amount</th><th className="p-2.5">Method</th><th className="p-2.5">Reference</th><th className="p-2.5">Status</th><th className="p-2.5">Invoice(s)</th><th className="p-2.5">Receipt</th><th className="p-2.5">Evidence</th></tr></thead>
              <tbody>{d.rows.map((p) => (
                <tr key={p.paymentId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-2.5"><Link href={`/payments/${p.paymentId}`} className="text-primary hover:underline text-xs font-medium">{p.paymentNumber}</Link></td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5"><Link href={`/customers/${p.customerId}`} className="text-primary hover:underline text-xs">{p.customerName}</Link></td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(p.amount).toLocaleString()}</td>
                  <td className="p-2.5 text-xs">{p.method.replace('_', ' ')}</td>
                  <td className="p-2.5 text-xs text-muted-foreground max-w-[100px] truncate">{p.reference || '—'}</td>
                  <td className="p-2.5 text-xs"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${p.status === 'APPROVED' ? 'bg-green-50 text-green-700' : p.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{p.status}</span></td>
                  <td className="p-2.5 text-xs text-muted-foreground">{p.invoiceNumbers.slice(0, 2).join(', ')}{p.invoiceNumbers.length > 2 ? ` +${p.invoiceNumbers.length - 2}` : ''}{p.invoiceNumbers.length === 0 ? '—' : ''}</td>
                  <td className="p-2.5 text-xs">{p.receiptNumber ? <Link href={`/receipts/${p.paymentId}`} className="text-primary hover:underline">{p.receiptNumber}</Link> : '—'}</td>
                  <td className="p-2.5">{p.hasEvidence ? <span title="Evidence attached"><Paperclip className="size-3 text-green-600" /></span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No payments found for this period and filters.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
