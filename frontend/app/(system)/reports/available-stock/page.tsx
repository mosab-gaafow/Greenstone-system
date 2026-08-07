'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAvailableStockReport } from '@/features/reports/hooks/use-reports';
import { ExportButton } from '@/components/shared/export-button';
import { ReportFilterPanel } from '@/components/shared/report-filter-panel';
import { ReportTableToolbar } from '@/components/shared/report-table-toolbar';
import { ReportKpiCard } from '@/components/shared/report-kpi-card';
import { ReportExportBar } from '@/components/shared/report-export-bar';

export default function AvailableStockPage() {
  const [search, setSearch] = useState('');
  const q = useAvailableStockReport({ search: search || undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link><h1 className="text-xl font-bold">Available Stock Report</h1><p className="text-xs text-muted-foreground">Stock available for new orders (physical minus reserved).</p></div>
                  <ReportExportBar source="reports/available-stock" params={{ search: search || undefined }} fileName="Available_Stock" />
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input placeholder="Search product name…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard label="Products" value={d?.summary.productCount ?? 0} tone="blue" />
        <ReportKpiCard label="Physical" value={d?.summary.totalPhysical?.toLocaleString() ?? 0} tone="blue" />
        <ReportKpiCard label="Reserved" value={d?.summary.totalReserved?.toLocaleString() ?? 0} tone="amber" />
        <ReportKpiCard label="Available" value={d?.summary.totalAvailable?.toLocaleString() ?? 0} tone="green" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Products with available stock</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Product</th><th className="p-2.5 text-right">Physical</th><th className="p-2.5 text-right">Reserved</th><th className="p-2.5 text-right">Available</th></tr></thead>
              <tbody>{d.rows.map((s) => (
                <tr key={s.productId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-2.5"><Link href={`/stock/${s.productId}`} className="text-primary hover:underline text-xs font-medium">{s.productName}</Link></td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{s.physicalQuantity.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-amber-600">{s.reservedQuantity.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">{s.availableQuantity.toLocaleString()}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="border-t-2 bg-muted/30 font-medium text-xs"><td className="p-2.5">Totals</td><td className="p-2.5 text-right tabular-nums">{d.summary.totalPhysical.toLocaleString()}</td><td className="p-2.5 text-right tabular-nums text-amber-600">{d.summary.totalReserved.toLocaleString()}</td><td className="p-2.5 text-right tabular-nums text-green-600">{d.summary.totalAvailable.toLocaleString()}</td></tr></tfoot>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No available stock.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
