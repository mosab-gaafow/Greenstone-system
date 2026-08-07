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
import { useInvoicesReport } from '@/features/reports/hooks/use-reports';

const INVOICE_STATUSES = ['All', 'ISSUED', 'VOIDED'];
const PAYMENT_STATUSES = ['All', 'Fully paid', 'Partially paid', 'Unpaid'];

export default function InvoicesReportPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const q = useInvoicesReport({ ...range, search: search || undefined, invoiceStatus: invoiceStatus !== 'All' ? invoiceStatus : undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;
  const rows = d?.rows.filter(r => paymentStatus === 'All' || r.paymentStatus === paymentStatus) ?? [];
  const exportParams = { from: range.from, to: range.to, search: search || undefined, invoiceStatus: invoiceStatus !== 'All' ? invoiceStatus : undefined };
  function clearAll() { setSearch(''); setInvoiceStatus('All'); setPaymentStatus('All'); }

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold tracking-tight">Invoices Report</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? ''}</p>
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <ReportKpiCard label="Invoices" value={d?.summary.invoiceCount ?? 0} tone="blue" />
        <ReportKpiCard label="Issued value" value={`KES ${Number(d?.summary.issuedValue ?? 0).toLocaleString()}`} tone="blue" />
        <ReportKpiCard label="Amount paid" value={`KES ${Number(d?.summary.amountPaid ?? 0).toLocaleString()}`} tone="green" />
        <ReportKpiCard label="Valid outstanding" value={`KES ${Number(d?.summary.validOutstanding ?? 0).toLocaleString()}`} tone="red" />
        <ReportKpiCard label="Voided" value={`KES ${Number(d?.summary.voidedValue ?? 0).toLocaleString()}${d?.summary.voidedCount ? ` (${d.summary.voidedCount})` : ''}`} tone="slate" />
      </div>

      <ReportFilterPanel onClear={clearAll}>
        <select className="h-8 rounded-md border bg-background px-2 text-xs" value={invoiceStatus} onChange={e => setInvoiceStatus(e.target.value)}>
          {INVOICE_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'Invoice: All' : s}</option>)}
        </select>
        <select className="h-8 rounded-md border bg-background px-2 text-xs" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'Payment: All' : s}</option>)}
        </select>
        <ReportFilterSheet filters={filters} />
      </ReportFilterPanel>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b">
          <ReportTableToolbar source="reports/invoices" params={exportParams} fileName="Invoices_Report"
            searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search invoices…" rowCount={rows.length} />
        </div>
        {loading ? <Skeleton className="h-64 w-full" /> : rows.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground"><th className="p-2.5">Invoice</th><th className="p-2.5">Date</th><th className="p-2.5">Customer</th><th className="p-2.5">Order</th><th className="p-2.5 text-right">Total</th><th className="p-2.5 text-right">Paid</th><th className="p-2.5 text-right">Outstanding</th><th className="p-2.5">Status</th><th className="p-2.5">Payment</th></tr></thead>
            <tbody>{rows.map((inv) => (
              <tr key={inv.invoiceId} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${inv.invoiceStatus === 'VOIDED' ? 'opacity-50' : ''}`}>
                <td className="p-2.5"><Link href={`/invoices/${inv.invoiceId}`} className="text-primary hover:underline text-xs font-medium">{inv.invoiceNumber}</Link></td>
                <td className="p-2.5 text-xs whitespace-nowrap text-muted-foreground">{new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td className="p-2.5"><Link href={`/customers/${inv.customerId}`} className="text-primary hover:underline text-xs">{inv.customerName}</Link></td>
                <td className="p-2.5"><Link href={`/orders/${inv.orderId}`} className="text-primary hover:underline text-xs">{inv.orderNumber}</Link></td>
                <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(inv.total).toLocaleString()}</td>
                <td className="p-2.5 text-right text-xs tabular-nums text-green-600">KES {Number(inv.amountPaid).toLocaleString()}</td>
                <td className="p-2.5 text-right text-xs tabular-nums">{inv.invoiceStatus === 'VOIDED' ? '—' : <span className="text-red-600">KES {Number(inv.outstanding).toLocaleString()}</span>}</td>
                <td className="p-2.5 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${inv.invoiceStatus === 'VOIDED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{inv.invoiceStatus}</span></td>
                <td className="p-2.5 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${inv.paymentStatus === 'Fully paid' ? 'bg-green-100 text-green-700' : inv.paymentStatus === 'Partially paid' ? 'bg-amber-100 text-amber-700' : inv.paymentStatus === 'VOIDED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{inv.paymentStatus}</span></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="p-6 text-sm text-muted-foreground text-center">No invoices found.</p>}
      </div>
    </div>
  );
}
