'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Receipt, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useInvoice, useVoidInvoice } from '@/features/invoices/hooks/use-invoices';
import { invoiceStatusLabel, paymentStatusLabel } from '@/features/invoices/types/invoice.types';
import { formatDateTime } from '@/lib/format';

const TONES: Record<string, StatusTone> = { ISSUED: 'info', VOIDED: 'danger' };

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useInvoice(id);
  const voidMut = useVoidInvoice(id);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState<string | null>(null);

  if (q.isPending) return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-40 w-full" /></div>;
  if (q.isError) return <div className="w-full p-4 sm:p-6 lg:p-8"><EmptyState icon={Receipt} title="Invoice not found" action={<Button variant="outline" render={<Link href="/invoices" />}><ArrowLeft className="size-4" />Back</Button>} /></div>;

  const inv = q.data;
  const canVoid = inv.status === 'ISSUED';

  return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
    <Button variant="ghost" size="sm" render={<Link href="/invoices" />} className="text-muted-foreground -ml-2 h-9"><ArrowLeft className="size-4" />Back to invoices</Button>
    <PageHeader icon={Receipt} title={inv.invoiceNumber} badge={<StatusBadge tone={TONES[inv.status]} label={invoiceStatusLabel(inv.status)} />} description={`Order ${inv.orderNumber} — ${inv.customerName}`} />
    <div className="flex flex-wrap gap-2">
      {(!inv.finance || Number(inv.finance.outstandingAmount) > 0) && (
        <Button render={<Link href={`/payments/new?invoiceId=${inv.id}&customerId=${inv.customerId}`} />} variant="outline"><Wallet className="size-4" />Record payment</Button>
      )}
      {canVoid && <Button variant="outline" onClick={() => setVoiding(true)} disabled={voidMut.isPending}>Void invoice</Button>}
    </div>
    <div className="max-w-2xl space-y-6">
      <Card><CardContent className="space-y-4">
        <DetailRow label="Customer"><Link href={`/customers/${inv.customerId}`} className="text-primary hover:underline">{inv.customerName}</Link></DetailRow>
        <DetailRow label="Order"><Link href={`/orders/${inv.orderId}`} className="text-primary hover:underline">{inv.orderNumber}</Link></DetailRow>
        <DetailRow label="Due date">{formatDateTime(inv.dueDate)}</DetailRow>
        {inv.voidReason && <DetailRow label="Void reason">{inv.voidReason}</DetailRow>}
      </CardContent></Card>
      <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-4 font-medium">Product</th><th className="p-4 text-right font-medium">Qty</th><th className="p-4 text-right font-medium">Unit price</th><th className="p-4 text-right font-medium">Line total</th></tr></thead><tbody>{inv.items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-4">{item.productName}</td><td className="p-4 text-right tabular-nums">{item.quantity}</td><td className="p-4 text-right tabular-nums">{item.unitPrice}</td><td className="p-4 text-right tabular-nums">{item.lineTotal}</td></tr>)}<tr><td colSpan={3} className="p-4 text-right font-semibold">Total</td><td className="p-4 text-right font-semibold tabular-nums">KES {inv.totalAmount}</td></tr></tbody></table></div></CardContent></Card>
      {/* Finance summary */}
      {inv.finance && (
        <Card><CardContent className="space-y-4">
          <div className="flex items-center gap-2"><span className="text-sm font-medium">Payment status:</span><StatusBadge tone={inv.finance.paymentStatus === 'FULLY_PAID' ? 'success' : inv.finance.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'neutral'} label={paymentStatusLabel(inv.finance.paymentStatus)} /></div>
          <DetailRow label="Total">KES {inv.finance.invoiceTotal}</DetailRow>
          <DetailRow label="Approved"><span className="text-green-600 font-medium">KES {inv.finance.approvedAmount}</span></DetailRow>
          <DetailRow label="Outstanding"><span className={Number(inv.finance.outstandingAmount) > 0 ? 'text-destructive font-semibold' : ''}>KES {inv.finance.outstandingAmount}</span></DetailRow>
          {Number(inv.finance.pendingAmount) > 0 && <DetailRow label="Pending">KES {inv.finance.pendingAmount}</DetailRow>}
          {Number(inv.finance.reversedAmount) > 0 && <DetailRow label="Reversed">KES {inv.finance.reversedAmount}</DetailRow>}
          {inv.finance.payments.length > 0 && (
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Payment history</p>
              <div className="space-y-1 text-sm">
                {inv.finance.payments.map((p) => <div key={p.paymentId} className="flex justify-between text-muted-foreground"><Link href={`/payments/${p.paymentId}`} className="text-primary hover:underline">{p.paymentNumber}</Link><span>{p.status} — KES {p.amount}</span></div>)}
              </div>
            </div>
          )}
        </CardContent></Card>
      )}

    </div>
    <ConfirmDialog open={voiding} onOpenChange={(o) => { if (!o) { setVoiding(false); setReason(''); setReasonErr(null); } }} title={`Void ${inv.invoiceNumber}?`} description="This cannot be undone." confirmLabel="Void invoice" destructive pending={voidMut.isPending} onConfirm={() => { const t = reason.trim(); if (!t) { setReasonErr('Required.'); return; } voidMut.mutate(t, { onSuccess: () => setVoiding(false) }); }}>
      <textarea className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" rows={3} placeholder="Reason (required)" value={reason} onChange={(e) => { setReason(e.target.value); if (reasonErr) setReasonErr(null); }} />
      {reasonErr && <p className="text-destructive text-sm">{reasonErr}</p>}
    </ConfirmDialog>
  </div>;
}
