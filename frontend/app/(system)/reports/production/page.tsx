'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { useProductionReport } from '@/features/reports/hooks/use-reports';

const STATUSES = ['All', 'IN_PROGRESS', 'COMPLETED'];

export default function ProductionReportPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const q = useProductionReport({ ...range, search: search || undefined, status: status !== 'All' ? status : undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Production Report</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search batch number or order…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-card px-2 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Batches</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-12" /> : <span className="text-lg font-bold tabular-nums">{d?.summary.batchCount ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Produced</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums">{d?.summary.totalProduced?.toLocaleString() ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Broken</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-red-600">{d?.summary.totalBroken?.toLocaleString() ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Usable</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-green-600">{d?.summary.totalUsable?.toLocaleString() ?? 0}</span>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Production batches</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Batch</th><th className="p-2.5">Date</th><th className="p-2.5">Purpose</th><th className="p-2.5">Order</th><th className="p-2.5 text-center">Products</th><th className="p-2.5 text-right">Produced</th><th className="p-2.5 text-right">Broken</th><th className="p-2.5 text-right">Usable</th><th className="p-2.5">Status</th></tr></thead>
              <tbody>{d.rows.map((b) => (
                <tr key={b.batchId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-2.5"><Link href={`/production/${b.batchId}`} className="text-primary hover:underline text-xs font-medium">{b.productionNumber}</Link></td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(b.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5 text-xs">{b.purpose === 'ORDER' ? 'Order' : 'General stock'}</td>
                  <td className="p-2.5 text-xs">{b.orderNumber ? <Link href={`/orders/${b.orderNumber}`} className="text-primary hover:underline">{b.orderNumber}</Link> : '—'}</td>
                  <td className="p-2.5 text-xs text-center">{b.productCount}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{b.totalProduced.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">{b.totalBroken.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">{b.totalUsable.toLocaleString()}</td>
                  <td className="p-2.5 text-xs"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${b.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{b.status.replace(/_/g, ' ')}</span></td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="border-t-2 bg-muted/30 font-medium text-xs"><td className="p-2.5" colSpan={5}>Totals</td><td className="p-2.5 text-right tabular-nums">{d.rows.reduce((s, b) => s + b.totalProduced, 0).toLocaleString()}</td><td className="p-2.5 text-right tabular-nums text-red-600">{d.rows.reduce((s, b) => s + b.totalBroken, 0).toLocaleString()}</td><td className="p-2.5 text-right tabular-nums text-green-600">{d.rows.reduce((s, b) => s + b.totalUsable, 0).toLocaleString()}</td><td className="p-2.5" /></tr></tfoot>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No production batches for this period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
