'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { DeliverySummaryCards } from '@/features/deliveries/components/delivery-summary-cards';
import { DeliveryList } from '@/features/deliveries/components/delivery-list';
import { deliveryKeys } from '@/features/deliveries/hooks/use-deliveries';

export default function DeliveriesPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Truck}
        title="Deliveries"
        description="Plan and track delivery trips."
        secondaryActions={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
        action={
          <Button render={<Link href="/deliveries/new" />} className="h-11 w-full sm:w-auto">
            <Plus className="size-4" aria-hidden />
            Plan delivery
          </Button>
        }
      />

      <DeliverySummaryCards />

      <Suspense fallback={<ListSkeleton />}>
        <DeliveryList />
      </Suspense>
    </div>
  );
}
