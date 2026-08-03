'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet, Paperclip, CheckCircle2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canApprovePurchasePayments } from '@/lib/permissions';
import {
  useApprovePurchasePayment,
  usePurchasePayment,
  useReversePurchasePayment,
} from '@/features/purchase-payments/hooks/use-purchase-payments';
import { evidenceDownloadUrl } from '@/features/purchase-payments/api/purchase-payments.api';
import {
  paymentMethodLabel,
  purchasePaymentStatusLabel,
  type PurchasePaymentStatus,
} from '@/features/purchase-payments/types/purchase-payment.types';
import { formatDate } from '@/lib/format';

const STATUS_TONE: Record<PurchasePaymentStatus, StatusTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REVERSED: 'neutral',
};

export default function PurchasePaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentUser();
  const query = usePurchasePayment(id);
  const approvePayment = useApprovePurchasePayment(id);
  const reversePayment = useReversePurchasePayment(id);

  const [reversing, setReversing] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  if (query.isPending) {
    return (
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon={Wallet}
          title="This purchase payment could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/purchase-payments" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to purchase payments
            </Button>
          }
        />
      </div>
    );
  }

  const payment = query.data;

  function closeReverseDialog() {
    setReversing(false);
    setReason('');
    setReasonError(null);
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/purchase-payments" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to purchase payments
      </Button>

      <PageHeader
        icon={Wallet}
        title={payment.paymentNumber}
        badge={<StatusBadge tone={STATUS_TONE[payment.status]} label={purchasePaymentStatusLabel(payment.status)} />}
        description={payment.supplierName}
        action={
          canApprovePurchasePayments(user) ? (
            <div className="flex w-full gap-2 sm:w-auto">
              {payment.status === 'PENDING' && (
                <Button
                  className="h-11 flex-1 sm:flex-none"
                  disabled={approvePayment.isPending}
                  onClick={() => {
                    approvePayment.mutate();
                  }}
                >
                  <CheckCircle2 className="size-4" aria-hidden />
                  Approve
                </Button>
              )}
              {payment.status === 'APPROVED' && (
                <Button
                  variant="outline"
                  className="h-11 flex-1 sm:flex-none"
                  onClick={() => {
                    setReversing(true);
                  }}
                >
                  <Undo2 className="size-4" aria-hidden />
                  Reverse
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Supplier">
              <Link href={`/suppliers/${payment.supplierId}`} className="text-primary hover:underline">
                {payment.supplierName}
              </Link>
            </DetailRow>
            <DetailRow label="Amount">KES {payment.amount}</DetailRow>
            <DetailRow label="Payment method">{paymentMethodLabel(payment.paymentMethod)}</DetailRow>
            <DetailRow label="Reference">{payment.paymentReference}</DetailRow>
            <DetailRow label="Payment date">{formatDate(payment.paymentDate)}</DetailRow>
            <DetailRow label="Uploaded evidence">
              {payment.hasEvidence ? (
                <a
                  href={evidenceDownloadUrl(payment.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  <Paperclip className="size-4" aria-hidden />
                  View file
                </a>
              ) : (
                <span className="text-muted-foreground">Not provided</span>
              )}
            </DetailRow>
            {payment.status === 'REVERSED' && payment.reversalReason && (
              <DetailRow label="Reversal reason">{payment.reversalReason}</DetailRow>
            )}
          </CardContent>
        </Card>

        {payment.allocations.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-4 font-medium">Purchase</th>
                      <th className="p-4 text-right font-medium">Allocated amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment.allocations.map((allocation) => (
                      <tr key={allocation.id} className="border-b last:border-0">
                        <td className="p-4">
                          <Link
                            href={`/purchases/${allocation.purchaseId}`}
                            className="text-primary hover:underline"
                          >
                            {allocation.purchaseNumber}
                          </Link>
                        </td>
                        <td className="p-4 text-right tabular-nums">KES {allocation.allocatedAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={reversing}
        onOpenChange={(open) => {
          if (!open) closeReverseDialog();
        }}
        title={`Reverse ${payment.paymentNumber}?`}
        description="This restores the amount to the supplier's outstanding balance. This cannot be undone."
        confirmLabel="Reverse payment"
        destructive
        pending={reversePayment.isPending}
        onConfirm={() => {
          const trimmed = reason.trim();

          if (!trimmed) {
            setReasonError('A reason is required to reverse a payment.');
            return;
          }

          reversePayment.mutate(trimmed, { onSuccess: closeReverseDialog });
        }}
      >
        <Textarea
          placeholder="Reason (required)"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (reasonError) {
              setReasonError(null);
            }
          }}
        />
        {reasonError && (
          <p className="text-destructive text-sm" role="alert">
            {reasonError}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
