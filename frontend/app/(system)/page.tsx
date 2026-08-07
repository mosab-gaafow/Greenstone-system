'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeDollarSign, BarChart3, Boxes, Droplets, FileText, Filter, Layers, LoaderCircle, Package, RefreshCw, Truck, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const PERIODS = [
  { key: 'today', label: 'Today', from: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, to: () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; } },
  { key: 'yesterday', label: 'Yesterday', from: () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; }, to: () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(23, 59, 59, 999); return d; } },
  { key: 'week', label: 'This week', from: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; } },
  { key: '7d', label: 'Last 7 days', from: () => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; } },
  { key: 'month', label: 'This month', from: () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; } },
  { key: 'lastMonth', label: 'Last month', from: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }, to: () => { const d = new Date(); d.setDate(0); d.setHours(23, 59, 59, 999); return d; } },
  { key: '3m', label: 'Last 3 months', from: () => { const d = new Date(); d.setDate(d.getDate() - 89); d.setHours(0, 0, 0, 0); return d; } },
  { key: 'year', label: 'This year', from: () => { const d = new Date(2026, 0, 1); return d; } },
  { key: 'custom', label: 'Custom', from: () => new Date() },
] as const;
type PeriodKey = typeof PERIODS[number]['key'];
function toISODate(d: Date) { return d.toISOString().split('T')[0]!; }
const DEFAULT: PeriodKey = 'week';
const DONUT_COLORS = ['#16a34a', '#d97706', '#e5e7eb'];

function KpiCard({ icon: Icon, label, value, href, accent }: { icon: React.ElementType; label: string; value: number; href?: string; accent: string }) {
  const inner = (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow cursor-pointer">
      <div className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${accent}`}><Icon className="size-5" /></div>
      <div className="min-w-0"><div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</div><div className="text-lg font-bold tabular-nums">{value.toLocaleString()}</div></div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function FinCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="rounded-xl border bg-card p-4 text-center"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-lg font-bold tabular-nums mt-1 ${accent}`}>KES {Number(value).toLocaleString()}</div></div>;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const range = useMemo(() => {
    const p = PERIODS.find((x) => x.key === period)!;
    if (period === 'custom' && customFrom && customTo) return { from: new Date(customFrom), to: new Date(customTo + 'T23:59:59.999Z') };
    const f = p.from(); const t = ('to' in p && p.to) ? p.to() : (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; })();
    return { from: f, to: t as Date };
  }, [period, customFrom, customTo]);

  const q = useDashboard(toISODate(range.from), toISODate(range.to));
  const d = q.data; const loading = q.isLoading || q.isFetching;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">{d?.periodLabel ?? 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/reports" />} className="gap-2 h-9"><BarChart3 className="size-3.5" />View Reports</Button>
          <Button variant="ghost" size="icon" className="size-9" onClick={() => q.refetch()}><RefreshCw className="size-4" /></Button>
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => setSheetOpen(true)}><Filter className="size-3.5" />Filter</Button>
        </div>
      </div>

      {/* Filter Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-sm">
          <SheetHeader><SheetTitle>Filter period</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              {PERIODS.filter((p) => p.key !== 'custom').map((p) => (
                <Button key={p.key} variant={period === p.key ? 'default' : 'outline'} size="sm" className="justify-start" onClick={() => { setPeriod(p.key); setSheetOpen(false); }}>{p.label}</Button>
              ))}
            </div>
            <Button variant={period === 'custom' ? 'default' : 'outline'} size="sm" className="w-full justify-start" onClick={() => setPeriod('custom')}>Custom</Button>
            {period === 'custom' && (
              <div className="space-y-2">
                <div><label className="text-xs text-muted-foreground">From</label><input type="date" className="w-full h-9 rounded border px-2 text-sm" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></div>
                <div><label className="text-xs text-muted-foreground">To</label><input type="date" className="w-full h-9 rounded border px-2 text-sm" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></div>
                <Button size="sm" onClick={() => setSheetOpen(false)} disabled={!customFrom || !customTo}>Apply</Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Package} label="Active orders" value={d?.kpis.activeOrders ?? 0} href="/orders" accent="bg-blue-50 text-blue-600" />
        <KpiCard icon={Truck} label="Pending deliveries" value={d?.kpis.pendingDeliveries ?? 0} href="/deliveries" accent="bg-amber-50 text-amber-600" />
        <KpiCard icon={FileText} label="Overdue invoices" value={d?.kpis.overdueInvoices ?? 0} href="/invoices" accent="bg-red-50 text-red-600" />
        <KpiCard icon={Droplets} label="Low-stock" value={d?.kpis.lowStockMaterials ?? 0} href="/raw-materials" accent="bg-orange-50 text-orange-600" />
        <KpiCard icon={Layers} label="Total finished stock" value={d?.kpis.totalFinishedStock ?? 0} href="/stock" accent="bg-green-50 text-green-600" />
        <KpiCard icon={Wallet} label="Pending payments" value={d?.kpis.pendingPayments ?? 0} href="/payments" accent="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={Users} label="Salary approvals" value={d?.kpis.pendingSalaryApprovals ?? 0} href="/salaries" accent="bg-cyan-50 text-cyan-600" />
        <KpiCard icon={BadgeDollarSign} label="Credit customers" value={d?.kpis.customersWithCredit ?? 0} href="/customers" accent="bg-rose-50 text-rose-600" />
      </div>

      {/* Financial */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <FinCard label="Total invoiced" value={d?.financialSummary.totalInvoiced ?? '0'} accent="text-blue-600" />
        <FinCard label="Payments received" value={d?.financialSummary.paymentsReceived ?? '0'} accent="text-green-600" />
        <FinCard label="Outstanding" value={d?.financialSummary.outstandingAmount ?? '0'} accent="text-amber-600" />
        <FinCard label="Expenses" value={d?.financialSummary.totalExpenses ?? '0'} accent="text-red-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Invoices vs Payments received</CardTitle></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-64 w-full" /> : (<div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={d?.chart ?? []}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} /><Tooltip /><Bar dataKey="invoiced" fill="#2563eb" name="Invoiced" radius={[3, 3, 0, 0]} /><Bar dataKey="received" fill="#16a34a" name="Received" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Invoice payment status</CardTitle></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-48 w-full" /> : (<div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: 'Paid', value: d!.invoiceStatus.fullyPaid }, { name: 'Partial', value: d!.invoiceStatus.partiallyPaid }, { name: 'Unpaid', value: d!.invoiceStatus.unpaid }]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value"><Cell fill="#16a34a" /><Cell fill="#d97706" /><Cell fill="#e5e7eb" /></Pie><Legend /></PieChart></ResponsiveContainer></div>)}</CardContent>
        </Card>
      </div>

      {/* Top 10 Orders */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Top 10 orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.topOrders && d.topOrders.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5 w-8">#</th><th className="p-2.5">Order</th><th className="p-2.5">Date</th><th className="p-2.5">Customer</th><th className="p-2.5 text-right">Total</th><th className="p-2.5 text-right">Paid</th><th className="p-2.5 text-right">Outstanding</th><th className="p-2.5">Status</th></tr></thead>
              <tbody>{d.topOrders.map((o) => (
                <tr key={o.orderId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-2.5 text-xs text-muted-foreground">{o.rank}</td>
                  <td className="p-2.5"><Link href={`/orders/${o.orderId}`} className="text-primary hover:underline text-xs font-medium">{o.orderNumber}</Link></td>
                  <td className="p-2.5 text-xs whitespace-nowrap">{new Date(o.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="p-2.5"><Link href={`/customers/${o.customerId}`} className="text-primary hover:underline text-xs">{o.customerName}</Link></td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(o.total).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">KES {Number(o.amountPaid).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">KES {Number(o.outstanding).toLocaleString()}</td>
                  <td className="p-2.5 text-xs"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${o.orderStatus === 'ISSUED' ? 'bg-blue-50 text-blue-700' : o.orderStatus === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{o.orderStatus}</span></td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="border-t-2 bg-muted/30 font-medium text-xs"><td className="p-2.5" colSpan={4}>Totals</td><td className="p-2.5 text-right tabular-nums">KES {d.topOrders.reduce((s, o) => s + Number(o.total), 0).toLocaleString()}</td><td className="p-2.5 text-right tabular-nums text-green-600">KES {d.topOrders.reduce((s, o) => s + Number(o.amountPaid), 0).toLocaleString()}</td><td className="p-2.5 text-right tabular-nums text-red-600">KES {d.topOrders.reduce((s, o) => s + Number(o.outstanding), 0).toLocaleString()}</td><td className="p-2.5" /></tr></tfoot>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No orders in this period.</p>}
        </CardContent>
      </Card>

      {/* Top 10 Customers by Payments */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Top 10 customers by payments received</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : d?.topCustomersByPayments && d.topCustomersByPayments.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-2.5 w-8">#</th><th className="p-2.5">Customer</th><th className="p-2.5 text-right">Orders</th><th className="p-2.5 text-right">Payments</th><th className="p-2.5 text-right">Invoiced</th><th className="p-2.5 text-right">Received</th><th className="p-2.5 text-right">Outstanding</th></tr></thead>
              <tbody>{d.topCustomersByPayments.map((c) => (
                <tr key={c.customerId} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-2.5 text-xs text-muted-foreground">{c.rank}</td>
                  <td className="p-2.5"><Link href={`/customers/${c.customerId}`} className="text-primary hover:underline text-xs font-medium">{c.customerName}</Link></td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{c.orderCount}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">{c.paymentCount}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums">KES {Number(c.totalInvoiced).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-green-600">KES {Number(c.paymentsReceived).toLocaleString()}</td>
                  <td className="p-2.5 text-right text-xs tabular-nums text-red-600">KES {Number(c.outstanding).toLocaleString()}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="border-t-2 bg-muted/30 font-medium text-xs"><td className="p-2.5" colSpan={2}>Totals</td><td className="p-2.5" /><td className="p-2.5" /><td className="p-2.5 text-right tabular-nums">KES {d.topCustomersByPayments.reduce((s, c) => s + Number(c.totalInvoiced), 0).toLocaleString()}</td><td className="p-2.5 text-right tabular-nums text-green-600">KES {d.topCustomersByPayments.reduce((s, c) => s + Number(c.paymentsReceived), 0).toLocaleString()}</td><td className="p-2.5 text-right tabular-nums text-red-600">KES {d.topCustomersByPayments.reduce((s, c) => s + Number(c.outstanding), 0).toLocaleString()}</td></tr></tfoot>
            </table></div>
          ) : <p className="p-4 text-sm text-muted-foreground">No customer payments in this period.</p>}
        </CardContent>
      </Card>

      {/* Stock by Product */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Finished stock by product</CardTitle></CardHeader>
        <CardContent>{loading ? <Skeleton className="h-64 w-full" /> : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d?.stockByProduct ?? []} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="physical" fill="#2563eb" name="Physical" radius={[0, 3, 3, 0]} />
                <Bar dataKey="available" fill="#16a34a" name="Available" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}</CardContent>
      </Card>
    </div>
  );
}
