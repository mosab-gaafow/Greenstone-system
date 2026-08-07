'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { ReportFilterPanel } from '@/components/shared/report-filter-panel';
import { ReportTableToolbar } from '@/components/shared/report-table-toolbar';
import { ReportKpiCard } from '@/components/shared/report-kpi-card';
import { ReportExportBar } from '@/components/shared/report-export-bar';
import { ExportButton } from '@/components/shared/export-button';
import { useDeliveriesReport } from '@/features/reports/hooks/use-reports';

const STATUSES = ['All', 'PLANNED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];

export default function DeliveriesReportPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const q = useDeliveriesReport({ ...range, search: search || undefined, status: status !== 'All' ? status : undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Deliveries Report</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportExportBar source="reports/deliveries" params={{ from: range.from, to: range.to, search: search || undefined, status: status !== "All" ? status : undefined }} fileName="Deliveries_Report" />
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search delivery number, order, customer…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-card px-2 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Trip count KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard label="Trips" value={d?.summary.tripCount ?? 0} tone="blue" />
        <ReportKpiCard label="Planned" value={d?.summary.plannedCount ?? 0} tone="blue" />
        <ReportKpiCard label="Dispatched" value={d?.summary.dispatchedCount ?? 0} tone="amber" />
        <ReportKpiCard label="Delivered" value={d?.summary.deliveredCount ?? 0} tone="green" />
      </div>

      {/* Quantity KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard label="Planned qty" value={d?.summary.plannedQty?.toLocaleString() ?? 0} tone="blue" />
        <ReportKpiCard label="Dispatched qty" value={d?.summary.dispatchedQty?.toLocaleString() ?? 0} tone="blue" />
        <ReportKpiCard label="Delivered qty" value={d?.summary.deliveredQty?.toLocaleString() ?? 0} tone="blue" />
        <ReportKpiCard label="Actual transport" value={`KES ${Number(d?.summary.actualTransportCost ?? 0).toLocaleString()}`} tone="blue" />
      </div>

      {/* Transport KPIs — actual vs planned */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-green-200"><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-green-600/70">Actual (dispatched/delivered)</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-green-600">KES {Number(d?.summary.actualTransportCost ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card className="border-blue-200"><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-blue-600/70">Planned (not yet incurred)</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-blue-600">KES {Number(d?.summary.plannedTransportCost ?? 0).toLocaleString()}</span>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Delivery trips</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Delivery</th><th className="p-2.5">Date</th><th className="p-2.5">Order</th><th className="p-2.5">Customer</th><th className="p-2.5">Driver</th><th className="p-2.5">Vehicle</th><th className="p-2.5 text-center">Items</th><th className="p-2.5 text-right">Qty</th><th className="p-2.5 text-right">Transport</th><th className="p-2.5">Status</th></tr></thead>
              <tbody>{d.rows.map((r) => (
                <tr key={r.deliveryId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-2.5"><Link href={`/deliveries/${r.deliveryId}`} className="text-primary hover:underline text-xs font-medium">{r.deliveryNumber}</Link></td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5 text-xs"><Link href={`/orders/${r.orderNumber}`} className="text-primary hover:underline">{r.orderNumber}</Link></td>
                  <td className="p-2.5 text-xs">{r.customerName}</td>
                  <td className="p-2.5 text-xs">{r.driverName}</td>
                  <td className="p-2.5 text-xs">{r.vehicleReg}</td>
                  <td className="p-2.5 text-xs text-center">{r.itemCount}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{r.totalQuantity.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{r.transportCost ? `KES ${Number(r.transportCost).toLocaleString()}` : '—'}</td>
                  <td className="p-2.5 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === 'DELIVERED' ? 'bg-green-50 text-green-700' : r.status === 'DISPATCHED' ? 'bg-amber-50 text-amber-700' : r.status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{r.status}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No deliveries for this period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
