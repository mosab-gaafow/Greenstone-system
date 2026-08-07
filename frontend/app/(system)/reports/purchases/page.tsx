'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { usePurchasesReport } from '@/features/reports/hooks/use-reports';

export default function PurchasesReportPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const q = usePurchasesReport({ ...range, search: search || undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Purchases Report</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input placeholder="Search purchase number or supplier…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Purchases</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-12" /> : <span className="text-lg font-bold tabular-nums">{d?.summary.purchaseCount ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Total cost</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums">KES {Number(d?.summary.totalCost ?? 0).toLocaleString()}</span>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Purchase records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Purchase</th><th className="p-2.5">Date</th><th className="p-2.5">Supplier</th><th className="p-2.5">Reference</th><th className="p-2.5 text-center">Items</th><th className="p-2.5 text-right">Total cost</th></tr></thead>
              <tbody>{d.rows.map((p) => (
                <tr key={p.purchaseId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-2.5"><Link href={`/purchases/${p.purchaseId}`} className="text-primary hover:underline text-xs font-medium">{p.purchaseNumber}</Link></td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5"><Link href={`/suppliers/${p.supplierId}`} className="text-primary hover:underline text-xs">{p.supplierName}</Link></td>
                  <td className="p-2.5 text-xs text-muted-foreground max-w-[120px] truncate">{p.reference || '—'}</td>
                  <td className="p-2.5 text-xs text-center">{p.itemCount}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(p.totalCost).toLocaleString()}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="border-t-2 bg-muted/30 font-medium text-xs"><td className="p-2.5" colSpan={5}>Total</td><td className="p-2.5 text-right tabular-nums">KES {d.rows.reduce((s, p) => s + Number(p.totalCost), 0).toLocaleString()}</td></tr></tfoot>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No purchases for this period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
