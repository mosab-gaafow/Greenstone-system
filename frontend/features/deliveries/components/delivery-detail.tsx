'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, Truck, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { EmptyState } from '@/components/data-display/empty-state';
import { useCompleteDelivery, useDelivery, useDispatchDelivery } from '../hooks/use-deliveries';
import { DeliveryStatusBadge } from './delivery-status-badge';
import { TransportDialog } from './transport-dialog';
import { formatDate } from '@/lib/format';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

export function DeliveryDetailView({ id }: { id: string }) {
  const query = useDelivery(id);
  const [transportOpen, setTransportOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const dispatchMutation = useDispatchDelivery(id);
  const completeMutation = useCompleteDelivery(id);

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

  const totalPlanned = delivery.items.reduce((s, i) => s + i.plannedQuantity, 0);
  const uniqueProducts = new Set(delivery.items.map((i) => i.productId)).size;

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

      {delivery.status === 'PLANNED' && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setTransportOpen(true)}
          >
            <Calculator className="size-4" aria-hidden />
            {delivery.transportRate ? 'Update transport' : 'Set transport'}
          </Button>
          <Button
            onClick={() => setDispatchOpen(true)}
            disabled={dispatchMutation.isPending}
          >
            <Send className="size-4" aria-hidden />
            Dispatch
          </Button>
        </div>
      )}

      {delivery.status === 'DISPATCHED' && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              // Build completion input: each item gets dispatched = delivered, broken = 0 by default
              const input = {
                items: delivery.items.map((item) => ({
                  orderItemId: item.orderItemId,
                  deliveredQuantity: item.dispatchedQuantity,
                  brokenQuantity: 0,
                })),
              };
              completeMutation.mutate(input);
            }}
            disabled={completeMutation.isPending}
          >
            <Send className="size-4" aria-hidden />
            {completeMutation.isPending ? 'Completing…' : 'Complete delivery'}
          </Button>
        </div>
      )}

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

        {/* Transport (Phase 8B) */}
        <Card>
          <CardContent className="space-y-4">
            {delivery.transportRate ? (
              <>
                <DetailRow label="Transport rate">
                  KES {delivery.transportRate}
                </DetailRow>
                {delivery.numberOfTrips != null && (
                  <DetailRow label="Trips">{delivery.numberOfTrips}</DetailRow>
                )}
                {delivery.totalTransportCost && (
                  <DetailRow label="Transport cost">
                    KES {delivery.totalTransportCost}
                  </DetailRow>
                )}
                {delivery.maxPiecesPerTruckSnapshot != null && (
                  <DetailRow label="Truck capacity (snapshot)">
                    {delivery.maxPiecesPerTruckSnapshot}
                  </DetailRow>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Transport not yet set.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <TransportDialog
        open={transportOpen}
        onOpenChange={setTransportOpen}
        deliveryId={delivery.id}
        itemCount={uniqueProducts}
        totalPlanned={totalPlanned}
        maxPiecesPerTruck={delivery.maxPiecesPerTruckSnapshot}
        currentRate={delivery.transportRate}
        currentTrips={delivery.numberOfTrips}
        currentCost={delivery.totalTransportCost}
      />

      <ConfirmDialog
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        title={`Dispatch ${delivery.deliveryNumber}?`}
        description="Finished stock will be permanently reduced. This cannot be undone."
        confirmLabel="Dispatch"
        destructive
        pending={dispatchMutation.isPending}
        onConfirm={() => {
          dispatchMutation.mutate(undefined, {
            onSuccess: () => setDispatchOpen(false),
          });
        }}
      />
    </div>
  );
}
