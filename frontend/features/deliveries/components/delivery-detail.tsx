'use client';

import Link from 'next/link';
import { ArrowLeft, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { EmptyState } from '@/components/data-display/empty-state';
import { useDelivery } from '../hooks/use-deliveries';
import { DeliveryStatusBadge } from './delivery-status-badge';
import { formatDate } from '@/lib/format';

export function DeliveryDetailView({ id }: { id: string }) {
  const query = useDelivery(id);

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
          icon={Truck}
          title="This delivery could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/deliveries" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to deliveries
            </Button>
          }
        />
      </div>
    );
  }

  const delivery = query.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/deliveries" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to deliveries
      </Button>

      <PageHeader
        icon={Truck}
        title={delivery.deliveryNumber}
        badge={<DeliveryStatusBadge status={delivery.status} />}
        description={`Order ${delivery.orderNumber} — ${delivery.customerName}`}
      />

      <div className="max-w-2xl space-y-6">
        {/* Core info */}
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Order">
              <Link
                href={`/orders/${delivery.orderId}`}
                className="text-primary hover:underline"
              >
                {delivery.orderNumber}
              </Link>
            </DetailRow>
            <DetailRow label="Customer">{delivery.customerName}</DetailRow>
            <DetailRow label="Delivery site">{delivery.addressLabel}</DetailRow>
            <DetailRow label="Address">{delivery.addressLine}</DetailRow>
            {delivery.addressDirections && (
              <DetailRow label="Directions">{delivery.addressDirections}</DetailRow>
            )}
            <DetailRow label="Delivery date">
              {formatDate(delivery.deliveryDate)}
            </DetailRow>
          </CardContent>
        </Card>

        {/* Driver & Vehicle */}
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Driver">{delivery.driverName}</DetailRow>
            <DetailRow label="Vehicle">
              {delivery.vehicleRegistrationNumber}
            </DetailRow>
            <DetailRow label="Payee">{delivery.payeeName}</DetailRow>
            <DetailRow label="Payee phone">{delivery.payeePhone}</DetailRow>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-medium">Product</th>
                    <th className="p-4 text-right font-medium">Planned</th>
                    <th className="p-4 text-right font-medium">Reserved</th>
                    <th className="p-4 text-right font-medium">Dispatched</th>
                    <th className="p-4 text-right font-medium">Delivered</th>
                    <th className="p-4 text-right font-medium">Broken</th>
                  </tr>
                </thead>
                <tbody>
                  {delivery.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-4">{item.productName}</td>
                      <td className="p-4 text-right tabular-nums">
                        {item.plannedQuantity}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {item.reservedQuantity}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {item.dispatchedQuantity}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {item.deliveredQuantity}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {item.brokenQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Transport (read-only, NULL until 8B/8C) */}
        {delivery.transportRate && (
          <Card>
            <CardContent className="space-y-4">
              <DetailRow label="Transport rate">
                KES {delivery.transportRate}
              </DetailRow>
              {delivery.numberOfTrips && (
                <DetailRow label="Trips">{delivery.numberOfTrips}</DetailRow>
              )}
              {delivery.totalTransportCost && (
                <DetailRow label="Transport cost">
                  KES {delivery.totalTransportCost}
                </DetailRow>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
