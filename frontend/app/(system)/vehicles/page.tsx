'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { VehicleSummaryCards } from '@/features/vehicles/components/vehicle-summary-cards';
import { VehicleList } from '@/features/vehicles/components/vehicle-list';
import { vehicleKeys } from '@/features/vehicles/hooks/use-vehicles';

export default function VehiclesPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Truck}
        title="Vehicles"
        description="Hired vehicles Greenstone uses for deliveries."
        secondaryActions={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
        action={
          <Button render={<Link href="/vehicles/new" />} className="h-11 w-full sm:w-auto">
            <Plus className="size-4" aria-hidden />
            Add vehicle
          </Button>
        }
      />

      <VehicleSummaryCards />

      {/* useSearchParams needs a Suspense boundary while prerendering. */}
      <Suspense fallback={<ListSkeleton />}>
        <VehicleList />
      </Suspense>
    </div>
  );
}
