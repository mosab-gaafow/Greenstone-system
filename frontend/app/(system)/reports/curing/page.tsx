'use client';

import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { useCuringReport } from '@/features/reports/hooks/use-reports';

export default function CuringReportPage() {
  const { range, filters } = useReportFilters();
  const q = useCuringReport({ ...range });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Curing Report</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Records</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-12" /> : <span className="text-lg font-bold tabular-nums">{d?.summary.recordCount ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Entered</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums">{d?.summary.totalEntering?.toLocaleString() ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Released</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-green-600">{d?.summary.totalReleased?.toLocaleString() ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending records</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-12" /> : <span className="text-lg font-bold tabular-nums text-amber-600">{d?.summary.pendingCount ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Qty still curing</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-amber-600">{d?.summary.pendingQuantity?.toLocaleString() ?? 0}</span>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Curing records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Batch</th><th className="p-2.5">Product</th><th className="p-2.5 text-right">Entering</th><th className="p-2.5">Duration</th><th className="p-2.5">Started</th><th className="p-2.5">Planned</th><th className="p-2.5">Released</th><th className="p-2.5 text-right">Broken</th><th className="p-2.5 text-right">Rel. Qty</th></tr></thead>
              <tbody>{d.rows.map((r) => (
                <tr key={r.curingId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-2.5"><Link href={`/production/${r.batchId}`} className="text-primary hover:underline text-xs font-medium">{r.productionNumber}</Link></td>
                  <td className="p-2.5 text-xs">{r.productName}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{r.quantityEntering.toLocaleString()}</td>
                  <td className="p-2.5 text-xs">{r.duration}</td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(r.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(r.plannedCompletion).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{r.actualRelease ? new Date(r.actualRelease).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">{r.brokenQuantity.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">{r.releasedQuantity?.toLocaleString() ?? '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No curing records for this period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
