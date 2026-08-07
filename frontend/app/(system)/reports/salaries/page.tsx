'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterSheet, useReportFilters } from '@/components/shared/report-filter-sheet';
import { useSalariesReport } from '@/features/reports/hooks/use-reports';

const SALARY_TYPES = ['All', 'WEEKLY', 'MONTHLY'];
const SALARY_STATUSES = ['All', 'APPROVED', 'PENDING', 'REVERSED'];

export default function SalariesReportPage() {
  const { range, filters } = useReportFilters();
  const [search, setSearch] = useState('');
  const [salaryType, setSalaryType] = useState('All');
  const [status, setStatus] = useState('All');
  const q = useSalariesReport({ ...range, search: search || undefined, salaryType: salaryType !== 'All' ? salaryType : undefined, status: status !== 'All' ? status : undefined });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Salaries Report</h1>
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
          <Input placeholder="Search salary number or employee…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-card px-2 text-xs" value={salaryType} onChange={(e) => setSalaryType(e.target.value)}>
          {SALARY_TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All types' : t === 'WEEKLY' ? 'Weekly' : 'Monthly'}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-card px-2 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          {SALARY_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Records</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-12" /> : <span className="text-lg font-bold tabular-nums">{d?.summary.salaryCount ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Recorded</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums">KES {Number(d?.summary.recordedAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Approved</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-green-600">KES {Number(d?.summary.approvedAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-amber-600">KES {Number(d?.summary.pendingAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Reversed</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-red-600">KES {Number(d?.summary.reversedAmount ?? 0).toLocaleString()}</span>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Salary records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Salary</th><th className="p-2.5">Date</th><th className="p-2.5">Employee</th><th className="p-2.5">Type</th><th className="p-2.5">Period</th><th className="p-2.5 text-right">Amount</th><th className="p-2.5">Method</th><th className="p-2.5">Status</th></tr></thead>
              <tbody>{d.rows.map((s) => (
                <tr key={s.salaryId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-2.5"><Link href={`/salaries/${s.salaryId}`} className="text-primary hover:underline text-xs font-medium">{s.salaryNumber}</Link></td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5"><Link href={`/employees/${s.employeeId}`} className="text-primary hover:underline text-xs">{s.employeeName}</Link></td>
                  <td className="p-2.5 text-xs">{s.salaryType === 'WEEKLY' ? 'Weekly' : 'Monthly'}</td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(s.periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(s.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(s.amount).toLocaleString()}</td>
                  <td className="p-2.5 text-xs">{s.paymentMethod.replace('_', ' ')}</td>
                  <td className="p-2.5 text-xs"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${s.status === 'APPROVED' ? 'bg-green-50 text-green-700' : s.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{s.status}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No salaries for this period and filters.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
