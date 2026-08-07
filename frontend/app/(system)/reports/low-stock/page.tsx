'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLowStockReport } from '@/features/reports/hooks/use-reports';

export default function LowStockPage() {
  const [search, setSearch] = useState('');
  const q = useLowStockReport({ search: search || undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Low Stock Report</h1>
          <p className="text-xs text-muted-foreground">Finished products at or below their configured reorder level. Requires reorder levels to be set on products.</p>
        </div>
        <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input placeholder="Search product name…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Products below reorder</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-12" /> : <span className="text-lg font-bold tabular-nums text-red-600">{d?.summary.productCount ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Available in low stock</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums">{d?.summary.totalAvailable?.toLocaleString() ?? 0}</span>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Products at or below reorder level</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Product</th><th className="p-2.5 text-right">Physical</th><th className="p-2.5 text-right">Reserved</th><th className="p-2.5 text-right">Available</th><th className="p-2.5 text-right">Reorder Level</th></tr></thead>
              <tbody>{d.rows.map((s) => (
                <tr key={s.productId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-2.5"><Link href={`/stock/${s.productId}`} className="text-primary hover:underline text-xs font-medium">{s.productName}</Link></td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{s.physicalQuantity.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-amber-600">{s.reservedQuantity.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">{s.availableQuantity.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{s.reorderLevel.toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : loading ? null : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <AlertTriangle className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No finished products are below their reorder level.</p>
              <p className="text-xs text-muted-foreground/60">Reorder levels are configured per product. Currently no products have reorder levels set that are above current stock.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
