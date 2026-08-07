'use client';

import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { useBillingSummary } from '@/features/reports/hooks/use-reports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function BillingSummaryPage() {
  const { range, filters } = useReportFilters('month');
  const q = useBillingSummary({ ...range });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Billing Summary</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      {/* Customer KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Invoiced</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-blue-600">KES {Number(d?.invoicedAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Payments received</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-green-600">KES {Number(d?.paymentsReceived ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Current customer out.</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-red-600">KES {Number(d?.currentCustomerOutstanding ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Expenses</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-rose-600">KES {Number(d?.expensesAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
      </div>

      {/* Operations KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Approved salaries</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-cyan-600">KES {Number(d?.approvedSalariesAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Purchases</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-violet-600">KES {Number(d?.purchasesAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Approved supp. pmts</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-emerald-600">KES {Number(d?.approvedPurchasePayments ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Current supplier out.</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-orange-600">KES {Number(d?.currentSupplierOutstanding ?? 0).toLocaleString()}</span>}</CardContent></Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Monthly financial trend</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-72 w-full" /> : d?.chart && d.chart.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.chart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip formatter={(v) => `KES ${Number(v).toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="invoiced" fill="#2563eb" name="Invoiced" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="received" fill="#16a34a" name="Received" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" fill="#e11d48" name="Expenses" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="salaries" fill="#0891b2" name="Salaries" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-muted-foreground">No data for charts in this period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
