'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useCancelOrder, useOrder } from '@/features/orders/hooks/use-orders';
import {
  isOrderCancellable,
  orderPaymentArrangementLabel,
  orderStatusLabel,
  type OrderPaymentArrangement,
  type OrderStatus,
} from '@/features/orders/types/order.types';

const PAYMENT_ARRANGEMENT_TONE: Record<OrderPaymentArrangement, StatusTone> = {
  PREPAID: 'success',
  CREDIT: 'info',
};

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  PENDING: 'neutral',
  IN_PRODUCTION: 'info',
  CURING: 'info',
  READY_FOR_DELIVERY: 'warning',
  PARTIALLY_DELIVERED: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useOrder(id);
  const cancelOrder = useCancelOrder(id);
  const [cancelling, setCancelling] = useState(false);
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
          icon={ShoppingCart}
          title="This order could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/orders" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to orders
            </Button>
          }
        />
      </div>
    );
  }

  const order = query.data;

  function closeCancelDialog() {
    setCancelling(false);
    setReason('');
    setReasonError(null);
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/orders" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to orders
      </Button>

      <PageHeader
        icon={ShoppingCart}
        title={order.orderNumber}
        badge={
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              tone={PAYMENT_ARRANGEMENT_TONE[order.paymentArrangement]}
              label={orderPaymentArrangementLabel(order.paymentArrangement)}
            />
            <StatusBadge tone={STATUS_TONE[order.status]} label={orderStatusLabel(order.status)} />
          </div>
        }
        description={order.customerName}
      />

      {isOrderCancellable(order.status) && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={cancelOrder.isPending}
            onClick={() => {
              setCancelling(true);
            }}
          >
            <Ban className="size-4" aria-hidden />
            Cancel order
          </Button>
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Customer">{order.customerName}</DetailRow>
            <DetailRow label="Delivery site">{order.addressLabel}</DetailRow>
            <DetailRow label="Address">{order.addressLine}</DetailRow>
            {order.addressDirections && (
              <DetailRow label="Directions">{order.addressDirections}</DetailRow>
            )}
            {order.statusReason && <DetailRow label="Reason">{order.statusReason}</DetailRow>}
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
                    <th className="p-4 text-right font-medium">Produced</th>
                    <th className="p-4 text-right font-medium">Allocated</th>
                    <th className="p-4 text-right font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-4">{item.productName}</td>
                      <td className="p-4 text-right tabular-nums">{item.quantity}</td>
                      <td className="p-4 text-right tabular-nums">{item.agreedUnitPrice}</td>
                      <td className="p-4 text-right tabular-nums">{item.lineTotal}</td>
                      <td className="p-4 text-right tabular-nums">{item.producedQuantity}</td>
                      <td className="p-4 text-right tabular-nums">{item.allocatedQuantity}</td>
                      <td className="p-4 text-right tabular-nums">{item.remainingQuantity}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="p-4 text-right font-semibold">
                      Total
                    </td>
                    <td className="p-4 text-right font-semibold tabular-nums">
                      KES {order.totalAmount}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={cancelling}
        onOpenChange={(open) => {
          if (!open) closeCancelDialog();
        }}
        title={`Cancel ${order.orderNumber}?`}
        description="The order will be marked cancelled. This cannot be undone."
        confirmLabel="Cancel order"
        destructive
        pending={cancelOrder.isPending}
        onConfirm={() => {
          const trimmed = reason.trim();

          if (!trimmed) {
            setReasonError('A reason is required to cancel an order.');
            return;
          }

          cancelOrder.mutate({ reason: trimmed }, { onSuccess: closeCancelDialog });
        }}
      >
        <Textarea
          placeholder="Reason (required)"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (reasonError) setReasonError(null);
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
