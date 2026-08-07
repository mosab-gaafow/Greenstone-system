'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilterPanel } from '@/components/shared/report-filter-panel';
import { ReportTableToolbar } from '@/components/shared/report-table-toolbar';
import { ReportKpiCard } from '@/components/shared/report-kpi-card';
import { ReportExportBar } from '@/components/shared/report-export-bar';
import { useSuppliersReport } from '@/features/reports/hooks/use-reports';

const BALANCE_FILTERS = [
  { value: 'all', label: 'All suppliers' },
  { value: 'has-outstanding', label: 'Has outstanding' },
  { value: 'zero-balance', label: 'Zero balance' },
];

export default function SuppliersReportPage() {
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const q = useSuppliersReport({ search: search || undefined, balanceFilter });
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold tracking-tight">Supplier Report</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Current supplier balances — opening + purchases − approved payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ReportKpiCard label="Active suppliers" value={d?.summary.supplierCount ?? 0} tone="blue" />
        <ReportKpiCard label="Total outstanding" value={`KES ${Number(d?.summary.totalOutstanding ?? 0).toLocaleString()}`} tone="red" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search name or phone…" className="pl-8 h-8 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-8 rounded-md border bg-card px-2 text-xs" value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)}>
          {BALANCE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{d?.rows.length ?? 0} supplier{(d?.rows.length ?? 0) !== 1 ? 's' : ''}</span>
        <ReportExportBar source="reports/suppliers" params={{ search: search || undefined, balanceFilter }} fileName="Suppliers_Report" />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b bg-muted/40 text-xs font-medium text-muted-foreground">Supplier balances</div>
        <div className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs font-medium text-muted-foreground"><th className="p-2.5">Supplier</th><th className="p-2.5">Phone</th><th className="p-2.5 text-right">Opening Bal.</th><th className="p-2.5 text-right">Purchases</th><th className="p-2.5 text-right">Approved Pmts</th><th className="p-2.5 text-right">Outstanding</th></tr></thead>
              <tbody>{d.rows.map((s) => (
                <tr key={s.supplierId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-2.5"><Link href={`/suppliers/${s.supplierId}`} className="text-primary hover:underline text-xs font-medium">{s.supplierName}</Link></td>
                  <td className="p-2.5 text-xs text-muted-foreground">{s.phone ?? '—'}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(s.openingBalance).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(s.totalPurchases).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">KES {Number(s.approvedPayments).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">KES {Number(s.outstanding).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="p-6 text-sm text-muted-foreground text-center">No matching suppliers found.</p>}
        </div>
      </div>
    </div>
  );
}
