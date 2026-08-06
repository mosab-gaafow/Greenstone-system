'use client';
import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { useReceipt } from '@/features/receipts/hooks/use-receipts';
import { receiptPdfUrl } from '@/features/receipts/api/receipts.api';
import { receiptStatusLabel, paymentMethodLabel } from '@/features/receipts/types/receipt.types';
import { formatDateTime } from '@/lib/format';

const STATUS_TONES: Record<string, StatusTone> = { ACTIVE: 'success', VOIDED: 'danger' };

export default function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useReceipt(id);

  if (q.isPending) return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-40 w-full" /></div>;
  if (q.isError) return <div className="w-full p-4 sm:p-6 lg:p-8"><EmptyState icon={Receipt} title="Receipt not found" action={<Button variant="outline" render={<Link href="/payments" />}><ArrowLeft className="size-4" />Back to payments</Button>} /></div>;

  const r = q.data;
  const isVoided = r.status === 'VOIDED';

  return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
    <Button variant="ghost" size="sm" render={<Link href="/payments" />} className="text-muted-foreground -ml-2 h-9"><ArrowLeft className="size-4" />Back to payments</Button>

    <PageHeader
      icon={Receipt}
      title={r.receiptNumber}
      badge={<StatusBadge tone={STATUS_TONES[r.status]} label={receiptStatusLabel(r.status)} />}
      description={`Payment ${r.payment.paymentNumber} — ${r.customer.name}`}
    />

    <div className="flex flex-wrap gap-2">
      <Button variant="outline" render={<a href={receiptPdfUrl(r.id)} target="_blank" rel="noopener noreferrer" />}><Download className="size-4" />Download Receipt</Button>
    </div>

    {isVoided && (
      <Card className="border-destructive/50 bg-destructive/5"><CardContent className="py-4">
        <p className="text-sm font-semibold text-destructive">This receipt has been voided.</p>
        <p className="text-sm text-muted-foreground mt-1">
          The payment was reversed{r.payment.reversalReason ? `: ${r.payment.reversalReason}` : '.'}
        </p>
      </CardContent></Card>
    )}

    <div className="max-w-2xl space-y-6">
      <Card><CardContent className="space-y-4">
        <DetailRow label="Receipt number">{r.receiptNumber}</DetailRow>
        <DetailRow label="Status"><StatusBadge tone={STATUS_TONES[r.status]} label={receiptStatusLabel(r.status)} /></DetailRow>
        <DetailRow label="Date">{formatDateTime(r.issuedAt)}</DetailRow>
        <DetailRow label="Customer">
          <Link href={`/customers/${r.customer.id}`} className="text-primary hover:underline">{r.customer.name}</Link>
        </DetailRow>
        {r.customer.phone && <DetailRow label="Phone">{r.customer.phone}</DetailRow>}
      </CardContent></Card>

      <Card><CardContent className="space-y-4">
        <DetailRow label="Payment">
          <Link href={`/payments/${r.payment.id}`} className="text-primary hover:underline">{r.payment.paymentNumber}</Link>
        </DetailRow>
        <DetailRow label="Amount received">KES {Number(r.amount).toLocaleString()}</DetailRow>
        <DetailRow label="Method">{paymentMethodLabel(r.payment.paymentMethod)}</DetailRow>
        {r.payment.paymentReference && <DetailRow label="Reference">{r.payment.paymentReference}</DetailRow>}
        <DetailRow label="Payment date">{formatDateTime(r.payment.paymentDate)}</DetailRow>
        {r.payment.approvedByUser?.name && <DetailRow label="Approved by">{r.payment.approvedByUser.name}</DetailRow>}
        {r.payment.approvedAt && <DetailRow label="Approved date">{formatDateTime(r.payment.approvedAt)}</DetailRow>}
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="p-4 font-medium">Invoice</th><th className="p-4 font-medium">Order</th><th className="p-4 text-right font-medium">Amount</th></tr></thead>
            <tbody>
              {r.allocations.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-4"><Link href={`/invoices/${a.invoiceId}`} className="text-primary hover:underline">{a.invoiceNumber}</Link></td>
                  <td className="p-4"><Link href={`/orders/${a.invoiceId}`} className="text-primary hover:underline">{a.orderNumber}</Link></td>
                  <td className="p-4 text-right tabular-nums">KES {Number(a.amount).toLocaleString()}</td>
                </tr>
              ))}
              <tr><td colSpan={2} className="p-4 text-right font-semibold">Total</td><td className="p-4 text-right font-semibold tabular-nums">KES {Number(r.amount).toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  </div>;
}
