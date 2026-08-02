'use client';

import { Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Ruler, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { MeasurementUnitList } from '@/features/measurement-units/components/measurement-unit-list';
import { measurementUnitKeys } from '@/features/measurement-units/hooks/use-measurement-units';

export default function MeasurementUnitsPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Ruler}
        title="Measurement units"
        description="Configurable units raw materials are measured in."
        secondaryActions={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: measurementUnitKeys.all });
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
      />

      {/* useSearchParams needs a Suspense boundary while prerendering. */}
      <Suspense fallback={<ListSkeleton />}>
        <MeasurementUnitList />
      </Suspense>
    </div>
  );
}
