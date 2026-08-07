'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"><ArrowLeft className="size-3" />Back to Reports</Link>
          <h1 className="text-xl font-bold">Suppliers Report</h1>
          <p className="text-xs text-muted-foreground">Current supplier balances — opening + purchases − approved payments.</p>
        </div>
        <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search name or phone…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-card px-2 text-xs" value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)}>
          {BALANCE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Active suppliers</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-12" /> : <span className="text-lg font-bold tabular-nums">{d?.summary.supplierCount ?? 0}</span>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">Total outstanding</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-6 w-20" /> : <span className="text-lg font-bold tabular-nums text-red-600">KES {Number(d?.summary.totalOutstanding ?? 0).toLocaleString()}</span>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Supplier balances</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.rows && d.rows.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5">Supplier</th><th className="p-2.5">Phone</th><th className="p-2.5 text-right">Opening Bal.</th><th className="p-2.5 text-right">Purchases</th><th className="p-2.5 text-right">Approved Pmts</th><th className="p-2.5 text-right">Outstanding</th></tr></thead>
              <tbody>{d.rows.map((s) => (
                <tr key={s.supplierId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-2.5"><Link href={`/suppliers/${s.supplierId}`} className="text-primary hover:underline text-xs font-medium">{s.supplierName}</Link></td>
                  <td className="p-2.5 text-xs text-muted-foreground">{s.phone ?? '—'}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(s.openingBalance).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(s.totalPurchases).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">KES {Number(s.approvedPayments).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">KES {Number(s.outstanding).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No matching suppliers found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
