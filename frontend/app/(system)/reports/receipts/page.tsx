'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { ReportKpiCard } from '@/components/shared/report-kpi-card';
import { ReportFilterPanel } from '@/components/shared/report-filter-panel';
import { ReportTableToolbar } from '@/components/shared/report-table-toolbar';
import { useReceiptsReport } from '@/features/reports/hooks/use-reports';

const RECEIPT_STATUSES = ['All', 'ACTIVE', 'VOIDED'];
const PAYMENT_METHODS = ['All', 'MPESA', 'CASH', 'BANK_TRANSFER', 'CHEQUE'];

export default function ReceiptsReportPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [method, setMethod] = useState('All');
  const q = useReceiptsReport({ ...range, search: search || undefined, receiptStatus: status !== 'All' ? status : undefined, paymentMethod: method !== 'All' ? method : undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;
  const exportParams = { from: range.from, to: range.to, search: search || undefined, receiptStatus: status !== 'All' ? status : undefined, paymentMethod: method !== 'All' ? method : undefined };
  function clearAll() { setSearch(''); setStatus('All'); setMethod('All'); }

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold tracking-tight">Receipts Report</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? ''}</p>
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <ReportKpiCard label="Total receipts" value={d?.summary.receiptCount ?? 0} tone="blue" />
        <ReportKpiCard label="Active amount" value={`KES ${Number(d?.summary.activeAmount ?? 0).toLocaleString()}`} tone="green" />
        <ReportKpiCard label="Active" value={d?.summary.activeCount ?? 0} tone="green" />
        <ReportKpiCard label="Voided amount" value={`KES ${Number(d?.summary.voidedAmount ?? 0).toLocaleString()}`} tone="red" />
        <ReportKpiCard label="Voided" value={d?.summary.voidedCount ?? 0} tone="slate" />
      </div>

      <ReportFilterPanel onClear={clearAll}>
        <select className="h-8 rounded-md border bg-background px-2 text-xs" value={status} onChange={e => setStatus(e.target.value)}>
          {RECEIPT_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'Status: All' : s}</option>)}
        </select>
        <select className="h-8 rounded-md border bg-background px-2 text-xs" value={method} onChange={e => setMethod(e.target.value)}>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m === 'All' ? 'Method: All' : m.replace('_', ' ')}</option>)}
        </select>
        <ReportFilterSheet filters={filters} />
      </ReportFilterPanel>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b">
          <ReportTableToolbar source="reports/receipts" params={exportParams} fileName="Receipts_Report"
            searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search receipts…" rowCount={d?.rows.length} />
        </div>
        {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground"><th className="p-2.5">Receipt</th><th className="p-2.5">Date</th><th className="p-2.5">Customer</th><th className="p-2.5">Payment</th><th className="p-2.5">Invoice</th><th className="p-2.5 text-right">Amount</th><th className="p-2.5">Method</th><th className="p-2.5">Status</th><th className="p-2.5 w-8" /></tr></thead>
            <tbody>{d.rows.map((r) => (
              <tr key={r.receiptId} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${r.status === 'VOIDED' ? 'opacity-50' : ''}`}>
                <td className="p-2.5"><Link href={`/receipts/${r.receiptId}`} className="text-primary hover:underline text-xs font-medium">{r.receiptNumber}</Link></td>
                <td className="p-2.5 text-xs whitespace-nowrap text-muted-foreground">{new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td className="p-2.5"><Link href={`/customers/${r.customerId}`} className="text-primary hover:underline text-xs">{r.customerName}</Link></td>
                <td className="p-2.5 text-xs">{r.paymentNumber}</td>
                <td className="p-2.5 text-xs">{r.invoiceNumber ?? '—'}</td>
                <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(r.amount).toLocaleString()}</td>
                <td className="p-2.5 text-xs">{r.paymentMethod.replace('_', ' ')}</td>
                <td className="p-2.5 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span></td>
                <td className="p-2.5"><FileText className="size-3 text-muted-foreground" /></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="p-6 text-sm text-muted-foreground text-center">No receipts found.</p>}
      </div>
    </div>
  );
}
