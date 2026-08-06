'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Calculator, ChevronDown, ChevronRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchCustomerStatement, type CustomerStatement, type StatementTransaction } from '../api/customers.api';
import { formatDateTime } from '@/lib/format';

const ACTIVITY_LABEL: Record<string, string> = {
  OPENING_BALANCE: 'Opening balance',
  BROUGHT_FORWARD: 'Balance brought forward',
  INVOICE: 'Invoice issued',
  PAYMENT: 'Payment received',
};
const ACTIVITY_CLASS: Record<string, string> = {
  OPENING_BALANCE: 'bg-gray-100 text-gray-600',
  BROUGHT_FORWARD: 'bg-gray-100 text-gray-600',
  INVOICE: 'bg-red-50 text-red-700',
  PAYMENT: 'bg-green-50 text-green-700',
};
const PAYMENT_STATUS_CLASS: Record<string, string> = {
  'Unpaid': 'bg-gray-100 text-gray-600',
  'Partially paid': 'bg-amber-50 text-amber-700',
  'Fully paid': 'bg-green-50 text-green-700',
};

type MobileExpanded = Record<number, boolean>;

export function StatementSection({ customerId }: { customerId: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomerStatement | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<MobileExpanded>({});

  const toggle = (i: number) => setExpanded((e) => ({ ...e, [i]: !e[i] }));

  const load = useCallback(async (fromVal?: string, toVal?: string) => {
    const f = fromVal ?? from;
    const t = toVal ?? to;
    if (f && t && f > t) { setValidation('"From" date must be before "To" date.'); return; }
    setValidation(null);
    setLoading(true); setError(null); setData(null); setExpanded({});
    try {
      setData(await fetchCustomerStatement(customerId, f || undefined, t || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load statement.');
    } finally { setLoading(false); }
  }, [customerId, from, to]);

  const clear = useCallback(() => { setFrom(''); setTo(''); setValidation(null); setError(null); load('', ''); }, [load]);

  const txnKey = (t: StatementTransaction, i: number) => `${t.type}-${t.reference}-${i}`;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="size-4 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold">Customer statement</h3>
            <p className="text-xs text-muted-foreground">Invoice and payment history for this customer.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 h-9 text-sm" />
          </div>
          <Button size="sm" onClick={() => load()} disabled={loading}>
            {loading && <LoaderCircle className="size-3.5 mr-1 animate-spin" />}Apply
          </Button>
          {(from || to) && <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>}
        </div>

        {validation && <p className="text-sm text-destructive">{validation}</p>}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => load()}><RefreshCw className="size-3.5 mr-1" />Retry</Button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Opening balance</div>
                <div className="text-sm font-semibold tabular-nums">KES {Number(data.openingBalance).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Total invoices</div>
                <div className="text-sm font-semibold tabular-nums text-red-600">KES {Number(data.totalInvoiced).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Total payments</div>
                <div className="text-sm font-semibold tabular-nums text-green-600">KES {Number(data.totalPaid).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Closing balance</div>
                <div className={`text-sm font-bold tabular-nums ${Number(data.closingBalance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  KES {Number(data.closingBalance).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="p-2.5 font-medium text-xs text-muted-foreground whitespace-nowrap">Date and time</th>
                    <th className="p-2.5 font-medium text-xs text-muted-foreground whitespace-nowrap">Activity</th>
                    <th className="p-2.5 font-medium text-xs text-muted-foreground whitespace-nowrap">Reference</th>
                    <th className="p-2.5 font-medium text-xs text-muted-foreground whitespace-nowrap">Related invoice</th>
                    <th className="p-2.5 font-medium text-xs text-muted-foreground">Details</th>
                    <th className="p-2.5 font-medium text-xs text-muted-foreground whitespace-nowrap">Method</th>
                    <th className="p-2.5 text-right font-medium text-xs text-muted-foreground whitespace-nowrap">Charge</th>
                    <th className="p-2.5 text-right font-medium text-xs text-muted-foreground whitespace-nowrap">Payment received</th>
                    <th className="p-2.5 text-right font-medium text-xs text-muted-foreground whitespace-nowrap">Running balance</th>
                    <th className="p-2.5 font-medium text-xs text-muted-foreground whitespace-nowrap">Record status</th>
                    <th className="p-2.5 font-medium text-xs text-muted-foreground whitespace-nowrap">Invoice payment status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t, i) => (
                    <tr key={txnKey(t, i)} className="border-t first:border-t-0">
                      <td className="p-2.5 text-xs whitespace-nowrap">{t.date ? formatDateTime(t.date) : '—'}</td>
                      <td className="p-2.5 text-xs whitespace-nowrap">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${ACTIVITY_CLASS[t.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ACTIVITY_LABEL[t.type] ?? t.type}
                        </span>
                      </td>
                      <td className="p-2.5 text-xs font-mono whitespace-nowrap">{t.reference || '—'}</td>
                      <td className="p-2.5 text-xs font-mono whitespace-nowrap">{t.relatedDocument || '—'}</td>
                      <td className="p-2.5 text-xs">{t.description}</td>
                      <td className="p-2.5 text-xs whitespace-nowrap">{t.method || '—'}</td>
                      <td className="p-2.5 text-right text-xs tabular-nums whitespace-nowrap">{Number(t.charge) > 0 ? `KES ${Number(t.charge).toLocaleString()}` : '—'}</td>
                      <td className="p-2.5 text-right text-xs tabular-nums whitespace-nowrap">{Number(t.payment) > 0 ? `KES ${Number(t.payment).toLocaleString()}` : '—'}</td>
                      <td className="p-2.5 text-right text-xs tabular-nums font-medium whitespace-nowrap">KES {Number(t.balance).toLocaleString()}</td>
                      <td className="p-2.5 text-xs whitespace-nowrap">{t.status || '—'}</td>
                      <td className="p-2.5 text-xs whitespace-nowrap">
                        {t.paymentStatus ? (
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${PAYMENT_STATUS_CLASS[t.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                            {t.paymentStatus}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-medium">
                    <td className="p-2.5 text-xs" colSpan={6}>Totals</td>
                    <td className="p-2.5 text-right text-xs tabular-nums whitespace-nowrap">KES {Number(data.totalInvoiced).toLocaleString()}</td>
                    <td className="p-2.5 text-right text-xs tabular-nums whitespace-nowrap">KES {Number(data.totalPaid).toLocaleString()}</td>
                    <td className="p-2.5 text-right text-xs tabular-nums font-bold whitespace-nowrap">KES {Number(data.closingBalance).toLocaleString()}</td>
                    <td className="p-2.5" colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {data.transactions.map((t, i) => (
                <div key={txnKey(t, i)} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${ACTIVITY_CLASS[t.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ACTIVITY_LABEL[t.type] ?? t.type}
                      </span>
                      <span className="text-xs text-muted-foreground">{t.date ? formatDateTime(t.date) : '—'}</span>
                    </div>
                    <button type="button" onClick={() => toggle(i)} className="size-6 flex items-center justify-center rounded hover:bg-muted">
                      {expanded[i] ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Charge</span>
                    <span className="tabular-nums">{Number(t.charge) > 0 ? `KES ${Number(t.charge).toLocaleString()}` : '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Payment received</span>
                    <span className="tabular-nums text-green-600">{Number(t.payment) > 0 ? `KES ${Number(t.payment).toLocaleString()}` : '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Balance</span>
                    <span className="tabular-nums">KES {Number(t.balance).toLocaleString()}</span>
                  </div>
                  {expanded[i] && (
                    <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                      {t.reference && <div className="flex justify-between"><span>Reference</span><span className="font-mono">{t.reference}</span></div>}
                      {t.description && <div className="flex justify-between"><span>Details</span><span>{t.description}</span></div>}
                      {t.method && <div className="flex justify-between"><span>Method</span><span>{t.method}</span></div>}
                      {t.status && <div className="flex justify-between"><span>Status</span><span>{t.status}</span></div>}
                      {t.paymentStatus && <div className="flex justify-between"><span>Payment status</span><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${PAYMENT_STATUS_CLASS[t.paymentStatus] ?? ''}`}>{t.paymentStatus}</span></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {data.transactions.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No statement transactions found for this date range.</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
