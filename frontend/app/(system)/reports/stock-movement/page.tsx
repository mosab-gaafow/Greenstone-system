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
import { useStockMovementReport } from '@/features/reports/hooks/use-reports';

const MOVEMENT_TYPES = ['All', 'OPENING', 'CURING_RELEASE', 'GENERAL_STOCK_RELEASE', 'DELIVERY_DISPATCH', 'BROKEN', 'POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT', 'CORRECTION'];

export default function StockMovementPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState('All');
  const q = useStockMovementReport({ ...range, search: search || undefined, movementType: movementType !== 'All' ? movementType : undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Stock Movement Report</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportExportBar source="reports/stock-movement" params={{ from: range.from, to: range.to, search: search || undefined, movementType: movementType !== "All" ? movementType : undefined }} fileName="Stock_Movement" />
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search product name…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-card px-2 text-xs" value={movementType} onChange={(e) => setMovementType(e.target.value)}>
          {MOVEMENT_TYPES.map(m => <option key={m} value={m}>{m === 'All' ? 'All types' : m.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ReportKpiCard label="Movements" value={d?.summary.movementCount ?? 0} tone="blue" />
        <ReportKpiCard label="Total in" value={d?.summary.totalIn?.toLocaleString() ?? 0} tone="green" />
        <ReportKpiCard label="Total out" value={d?.summary.totalOut?.toLocaleString() ?? 0} tone="red" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Stock movement ledger</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Date/time</th><th className="p-2.5">Product</th><th className="p-2.5">Type</th><th className="p-2.5 text-right">In</th><th className="p-2.5 text-right">Out</th><th className="p-2.5 text-right">Balance</th><th className="p-2.5">Reference</th><th className="p-2.5">Reason</th></tr></thead>
              <tbody>{d.rows.map((m) => (
                <tr key={m.movementId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(m.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="p-2.5 text-xs">{m.productName}</td>
                  <td className="p-2.5 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${['OPENING','CURING_RELEASE','GENERAL_STOCK_RELEASE','POSITIVE_ADJUSTMENT'].includes(m.movementType) ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{m.movementType.replace(/_/g, ' ')}</span></td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">{m.quantityIn > 0 ? m.quantityIn.toLocaleString() : '—'}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">{m.quantityOut > 0 ? m.quantityOut.toLocaleString() : '—'}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{m.balanceAfter.toLocaleString()}</td>
                  <td className="p-2.5 text-xs max-w-[150px] truncate">{m.referenceLabel ? (m.referenceHref ? <Link href={m.referenceHref} className="text-primary hover:underline">{m.referenceLabel}</Link> : m.referenceLabel) : '—'}</td>
                  <td className="p-2.5 text-xs text-muted-foreground max-w-[120px] truncate">{m.reason || '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No stock movements for this period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
