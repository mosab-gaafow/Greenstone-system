'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { DriverSummaryCards } from '@/features/drivers/components/driver-summary-cards';
import { DriverList } from '@/features/drivers/components/driver-list';
import { driverKeys } from '@/features/drivers/hooks/use-drivers';

export default function DriversPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Truck}
        title="Drivers"
        description="The drivers Greenstone employs for deliveries."
        secondaryActions={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: driverKeys.all });
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
        action={
          <Button render={<Link href="/drivers/new" />} className="h-11 w-full sm:w-auto">
            <Plus className="size-4" aria-hidden />
            Add driver
          </Button>
        }
      />

      <DriverSummaryCards />

      {/* useSearchParams needs a Suspense boundary while prerendering. */}
      <Suspense fallback={<ListSkeleton />}>
        <DriverList />
      </Suspense>
    </div>
  );
}
