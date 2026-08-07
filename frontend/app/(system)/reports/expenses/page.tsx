'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Paperclip, RefreshCw, Search } from 'lucide-react';
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
import { useExpensesReport } from '@/features/reports/hooks/use-reports';

const CATEGORIES = ['All', 'ELECTRICITY', 'WATER', 'RENT', 'TRANSPORT', 'MAINTENANCE', 'SUPPLIES', 'COMMUNICATION', 'INSURANCE', 'LICENSES', 'OTHER'];

export default function ExpensesReportPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const q = useExpensesReport({ ...range, search: search || undefined, category: category !== 'All' ? category : undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Expenses Report</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <ReportExportBar source="reports/expenses" params={{ from: range.from, to: range.to, search: search || undefined, category: category !== "All" ? category : undefined }} fileName="Expenses_Report" />
          <ReportFilterSheet filters={filters} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search expense number or description…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-card px-2 text-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? 'All categories' : c.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ReportKpiCard label="Expenses" value={d?.summary.expenseCount ?? 0} tone="blue" />
        <ReportKpiCard label="Total amount" value={`KES ${Number(d?.summary.totalAmount ?? 0).toLocaleString()}`} tone="red" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Expense records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Expense</th><th className="p-2.5">Date</th><th className="p-2.5">Category</th><th className="p-2.5">Description</th><th className="p-2.5 text-right">Amount</th><th className="p-2.5">Method</th><th className="p-2.5">Reference</th><th className="p-2.5">Evidence</th></tr></thead>
              <tbody>{d.rows.map((e) => (
                <tr key={e.expenseId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-2.5"><Link href={`/expenses/${e.expenseId}`} className="text-primary hover:underline text-xs font-medium">{e.expenseNumber}</Link></td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5 text-xs">{e.category.replace(/_/g, ' ')}</td>
                  <td className="p-2.5 text-xs text-muted-foreground max-w-[150px] truncate">{e.description}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(e.amount).toLocaleString()}</td>
                  <td className="p-2.5 text-xs">{e.paymentMethod.replace('_', ' ')}</td>
                  <td className="p-2.5 text-xs text-muted-foreground max-w-[100px] truncate">{e.paymentReference || '—'}</td>
                  <td className="p-2.5">{e.hasEvidence ? <span title="Evidence attached"><Paperclip className="size-3 text-green-600" /></span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="border-t-2 bg-muted/30 font-medium text-xs"><td className="p-2.5" colSpan={4}>Total</td><td className="p-2.5 text-right tabular-nums">KES {d.rows.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()}</td><td className="p-2.5" colSpan={3} /></tr></tfoot>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No expenses for this period.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
