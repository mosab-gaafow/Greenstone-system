'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { useOrder } from '@/features/orders/hooks/use-orders';
import { orderPaymentTypeLabel, type OrderPaymentType } from '@/features/orders/types/order.types';

const PAYMENT_TYPE_TONE: Record<OrderPaymentType, StatusTone> = {
  CASH: 'success',
  CREDIT: 'info',
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useOrder(id);

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
          <StatusBadge
            tone={PAYMENT_TYPE_TONE[order.paymentType]}
            label={orderPaymentTypeLabel(order.paymentType)}
          />
        }
        description={order.customerName}
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Customer">{order.customerName}</DetailRow>
            <DetailRow label="Delivery site">{order.addressLabel}</DetailRow>
            <DetailRow label="Address">{order.addressLine}</DetailRow>
            {order.addressDirections && (
              <DetailRow label="Directions">{order.addressDirections}</DetailRow>
            )}
            {order.sourceQuotationId && (
              <DetailRow label="Source quotation">
                <Link
                  href={`/quotations/${order.sourceQuotationId}`}
                  className="text-primary hover:underline"
                >
                  View quotation
                </Link>
              </DetailRow>
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
                      <td className="p-4 text-right tabular-nums">{item.remainingQuantity}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="p-4 text-right font-semibold">
                      Total
                    </td>
                    <td colSpan={2} className="p-4 text-right font-semibold tabular-nums">
                      KES {order.totalAmount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
