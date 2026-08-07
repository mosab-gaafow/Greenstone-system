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
import { useTopCustomers } from '@/features/reports/hooks/use-reports';

export default function TopCustomersPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');

  const q = useTopCustomers({ ...range, limit: 20, search: search || undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Top Customers by Payments</h1>
          <p className="text-xs text-muted-foreground">Ranked by approved payments received. {d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportExportBar source="reports/top-customers" params={{ from: range.from, to: range.to, search: search || undefined }} fileName="Top_Customers" />
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input placeholder="Search customer name…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Ranked by approved payments received (highest first)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5 w-8">#</th><th className="p-2.5">Customer</th><th className="p-2.5 text-right">Orders</th><th className="p-2.5 text-right">Payments</th><th className="p-2.5 text-right">Invoiced</th><th className="p-2.5 text-right">Received</th><th className="p-2.5 text-right">Outstanding</th></tr></thead>
              <tbody>{d.rows.map((c) => (
                <tr key={c.customerId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-2.5 text-xs text-muted-foreground">{c.rank}</td>
                  <td className="p-2.5"><Link href={`/customers/${c.customerId}`} className="text-primary hover:underline text-xs font-medium">{c.customerName}</Link></td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{c.orderCount}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{c.paymentCount}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(c.totalInvoiced).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">KES {Number(c.paymentsReceived).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">KES {Number(c.outstanding).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No approved payments found for this period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
