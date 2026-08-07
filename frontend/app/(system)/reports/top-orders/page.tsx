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
import { useTopOrders } from '@/features/reports/hooks/use-reports';

export default function TopOrdersPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');

  const q = useTopOrders({ ...range, limit: 20, search: search || undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Top Orders by Value</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportExportBar source="reports/top-orders" params={{ from: range.from, to: range.to, search: search || undefined }} fileName="Top_Orders" />
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input placeholder="Search order number or customer…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Ranked by invoice total (highest first)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5 w-8">#</th><th className="p-2.5">Order</th><th className="p-2.5">Date</th><th className="p-2.5">Customer</th><th className="p-2.5 text-right">Total</th><th className="p-2.5 text-right">Paid</th><th className="p-2.5 text-right">Outstanding</th><th className="p-2.5">Payment</th><th className="p-2.5">Fulfillment</th></tr></thead>
              <tbody>{d.rows.map((o) => (
                <tr key={o.orderId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-2.5 text-xs text-muted-foreground">{o.rank}</td>
                  <td className="p-2.5"><Link href={`/orders/${o.orderId}`} className="text-primary hover:underline text-xs font-medium">{o.orderNumber}</Link></td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(o.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5"><Link href={`/customers/${o.customerId}`} className="text-primary hover:underline text-xs">{o.customerName}</Link></td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(o.total).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">KES {Number(o.amountPaid).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">KES {Number(o.outstanding).toLocaleString()}</td>
                  <td className="p-2.5 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${o.paymentStatus === 'Fully paid' ? 'bg-green-50 text-green-700' : o.paymentStatus === 'Partially paid' ? 'bg-amber-50 text-amber-700' : o.paymentStatus === 'VOIDED' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{o.paymentStatus}</span></td>
                  <td className="p-2.5 text-xs"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${o.fulfillmentStatus === 'COMPLETED' ? 'bg-green-50 text-green-700' : o.fulfillmentStatus === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{o.fulfillmentStatus.replace(/_/g, ' ')}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No orders found for this period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
