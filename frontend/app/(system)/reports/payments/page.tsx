'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Paperclip, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { ReportKpiCard } from '@/components/shared/report-kpi-card';
import { ReportFilterPanel } from '@/components/shared/report-filter-panel';
import { ReportTableToolbar } from '@/components/shared/report-table-toolbar';
import { usePaymentsReport } from '@/features/reports/hooks/use-reports';

const PAYMENT_STATUSES = ['All', 'APPROVED', 'PENDING', 'REVERSED'];
const PAYMENT_METHODS = ['All', 'MPESA', 'CASH', 'BANK_TRANSFER', 'CHEQUE'];

export default function PaymentsReportPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [method, setMethod] = useState('All');
  const q = usePaymentsReport({ ...range, search: search || undefined, paymentStatus: status !== 'All' ? status : undefined, paymentMethod: method !== 'All' ? method : undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;
  const exportParams = { from: range.from, to: range.to, search: search || undefined, paymentStatus: status !== 'All' ? status : undefined, paymentMethod: method !== 'All' ? method : undefined };
  function clearAll() { setSearch(''); setStatus('All'); setMethod('All'); }

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold tracking-tight">Payments Report</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? ''}</p>
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <ReportKpiCard label="Payments" value={d?.summary.paymentCount ?? 0} tone="blue" />
        <ReportKpiCard label="Recorded" value={`KES ${Number(d?.summary.recordedAmount ?? 0).toLocaleString()}`} tone="blue" />
        <ReportKpiCard label="Approved" value={`KES ${Number(d?.summary.approvedAmount ?? 0).toLocaleString()}`} tone="green" />
        <ReportKpiCard label="Pending" value={`KES ${Number(d?.summary.pendingAmount ?? 0).toLocaleString()}`} tone="amber" />
        <ReportKpiCard label="Reversed" value={`KES ${Number(d?.summary.reversedAmount ?? 0).toLocaleString()}`} tone="red" />
      </div>

      <ReportFilterPanel onClear={clearAll}>
        <select className="h-8 rounded-md border bg-background px-2 text-xs" value={status} onChange={e => setStatus(e.target.value)}>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'Status: All' : s}</option>)}
        </select>
        <select className="h-8 rounded-md border bg-background px-2 text-xs" value={method} onChange={e => setMethod(e.target.value)}>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m === 'All' ? 'Method: All' : m.replace('_', ' ')}</option>)}
        </select>
        <ReportFilterSheet filters={filters} />
      </ReportFilterPanel>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b">
          <ReportTableToolbar source="reports/payments" params={exportParams} fileName="Payments_Report"
            searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search payments…" rowCount={d?.rows.length} />
        </div>
        {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground"><th className="p-2.5">Payment</th><th className="p-2.5">Date</th><th className="p-2.5">Customer</th><th className="p-2.5 text-right">Amount</th><th className="p-2.5">Method</th><th className="p-2.5">Reference</th><th className="p-2.5">Status</th><th className="p-2.5">Invoices</th><th className="p-2.5">Receipt</th><th className="p-2.5">Evidence</th></tr></thead>
            <tbody>{d.rows.map((p) => (
              <tr key={p.paymentId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-2.5"><Link href={`/payments/${p.paymentId}`} className="text-primary hover:underline text-xs font-medium">{p.paymentNumber}</Link></td>
                <td className="p-2.5 text-xs whitespace-nowrap text-muted-foreground">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td className="p-2.5"><Link href={`/customers/${p.customerId}`} className="text-primary hover:underline text-xs">{p.customerName}</Link></td>
                <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(p.amount).toLocaleString()}</td>
                <td className="p-2.5 text-xs">{p.method.replace('_', ' ')}</td>
                <td className="p-2.5 text-xs text-muted-foreground max-w-[100px] truncate">{p.reference || '—'}</td>
                <td className="p-2.5 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span></td>
                <td className="p-2.5 text-xs text-muted-foreground">{p.invoiceNumbers.slice(0, 2).join(', ')}{p.invoiceNumbers.length > 2 ? ` +${p.invoiceNumbers.length - 2}` : ''}{p.invoiceNumbers.length === 0 ? '—' : ''}</td>
                <td className="p-2.5 text-xs">{p.receiptNumber ? <Link href={`/receipts/${p.paymentId}`} className="text-primary hover:underline">{p.receiptNumber}</Link> : '—'}</td>
                <td className="p-2.5">{p.hasEvidence ? <Paperclip className="size-3 text-green-600" /> : <span className="text-xs text-muted-foreground">—</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="p-6 text-sm text-muted-foreground text-center">No payments found.</p>}
      </div>
    </div>
  );
}
