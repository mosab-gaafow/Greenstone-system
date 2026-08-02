'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, Check, Download, FileText, PencilLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  useAcceptQuotation,
  useCancelQuotation,
  useQuotation,
  useRejectQuotation,
} from '@/features/quotations/hooks/use-quotations';
import { quotationPdfUrl } from '@/features/quotations/api/quotations.api';
import { quotationStatusLabel, type QuotationStatus } from '@/features/quotations/types/quotation.types';

const STATUS_TONE: Record<QuotationStatus, StatusTone> = {
  DRAFT: 'neutral',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

type ReasonAction = 'reject' | 'cancel' | undefined;

export default function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useQuotation(id);
  const acceptQuotation = useAcceptQuotation(id);
  const rejectQuotation = useRejectQuotation(id);
  const cancelQuotation = useCancelQuotation(id);
  const [reasonAction, setReasonAction] = useState<ReasonAction>(undefined);
  const [reason, setReason] = useState('');

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
          icon={FileText}
          title="This quotation could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/quotations" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to quotations
            </Button>
          }
        />
      </div>
    );
  }

  const quotation = query.data;
  const pending = acceptQuotation.isPending || rejectQuotation.isPending || cancelQuotation.isPending;

  function closeReasonDialog() {
    setReasonAction(undefined);
    setReason('');
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/quotations" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to quotations
      </Button>

      <PageHeader
        icon={FileText}
        title={quotation.quotationNumber}
        badge={
          <StatusBadge
            tone={STATUS_TONE[quotation.status]}
            label={quotationStatusLabel(quotation.status)}
          />
        }
        description={quotation.customerName}
        secondaryActions={
          <Button
            variant="outline"
            className="h-11"
            render={<a href={quotationPdfUrl(quotation.id)} target="_blank" rel="noopener noreferrer" />}
          >
            <Download className="size-4" aria-hidden />
            Download PDF
          </Button>
        }
        action={
          quotation.status === 'DRAFT' ? (
            <Button
              render={<Link href={`/quotations/${quotation.id}/edit`} />}
              className="h-11 w-full sm:w-auto"
            >
              <PencilLine className="size-4" aria-hidden />
              Edit
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        {quotation.status === 'DRAFT' && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              acceptQuotation.mutate();
            }}
          >
            <Check className="size-4" aria-hidden />
            Accept
          </Button>
        )}
        {quotation.status === 'DRAFT' && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setReasonAction('reject');
            }}
          >
            <X className="size-4" aria-hidden />
            Reject
          </Button>
        )}
        {(quotation.status === 'DRAFT' || quotation.status === 'ACCEPTED') && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setReasonAction('cancel');
            }}
          >
            <Ban className="size-4" aria-hidden />
            Cancel
          </Button>
        )}
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Customer">{quotation.customerName}</DetailRow>
            {quotation.statusReason && (
              <DetailRow label="Reason">{quotation.statusReason}</DetailRow>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-medium">Product</th>
                    <th className="p-4 text-right font-medium">Qty</th>
                    <th className="p-4 text-right font-medium">Unit price</th>
                    <th className="p-4 text-right font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-4">{item.productName}</td>
                      <td className="p-4 text-right tabular-nums">{item.quantity}</td>
                      <td className="p-4 text-right tabular-nums">{item.agreedUnitPrice}</td>
                      <td className="p-4 text-right tabular-nums">{item.lineTotal}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="p-4 text-right font-semibold">
                      Total
                    </td>
                    <td className="p-4 text-right font-semibold tabular-nums">
                      KES {quotation.totalAmount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={reasonAction !== undefined}
        onOpenChange={(open) => {
          if (!open) closeReasonDialog();
        }}
        title={reasonAction === 'reject' ? `Reject ${quotation.quotationNumber}?` : `Cancel ${quotation.quotationNumber}?`}
        description={
          reasonAction === 'reject'
            ? 'The quotation will be marked rejected. This cannot be undone.'
            : 'The quotation will be marked cancelled. This cannot be undone.'
        }
        confirmLabel={reasonAction === 'reject' ? 'Reject' : 'Cancel quotation'}
        destructive
        pending={pending}
        onConfirm={() => {
          const values = { reason: reason.trim() ? reason.trim() : undefined };

          if (reasonAction === 'reject') {
            rejectQuotation.mutate(values, { onSettled: closeReasonDialog });
          } else if (reasonAction === 'cancel') {
            cancelQuotation.mutate(values, { onSettled: closeReasonDialog });
          }
        }}
      >
        <Textarea
          placeholder="Reason (optional)"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
          }}
        />
      </ConfirmDialog>
    </div>
  );
}
