'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { VehicleOwnerSummaryCards } from '@/features/vehicle-owners/components/vehicle-owner-summary-cards';
import { VehicleOwnerList } from '@/features/vehicle-owners/components/vehicle-owner-list';
import { vehicleOwnerKeys } from '@/features/vehicle-owners/hooks/use-vehicle-owners';

export default function VehicleOwnersPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Building2}
        title="Vehicle owners"
        description="The registered owners Greenstone pays for transport."
        secondaryActions={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: vehicleOwnerKeys.all });
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
        action={
          <Button render={<Link href="/vehicle-owners/new" />} className="h-11 w-full sm:w-auto">
            <Plus className="size-4" aria-hidden />
            Add vehicle owner
          </Button>
        }
      />

      <VehicleOwnerSummaryCards />

      {/* useSearchParams needs a Suspense boundary while prerendering. */}
      <Suspense fallback={<ListSkeleton />}>
        <VehicleOwnerList />
      </Suspense>
    </div>
  );
}
