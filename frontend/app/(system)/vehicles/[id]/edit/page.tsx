'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/data-display/empty-state';
import { VehicleFormDialog } from '@/features/vehicles/components/vehicle-form-dialog';
import { useUpdateVehicle, useVehicle } from '@/features/vehicles/hooks/use-vehicles';

export default function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const query = useVehicle(id);
  const updateVehicle = useUpdateVehicle(id);

  function close() {
    router.push(`/vehicles/${id}`);
  }

  if (query.isPending) {
    return (
      <PageContainer title="Edit vehicle">
        <div className="max-w-xl space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (query.isError) {
    return (
      <PageContainer title="Edit vehicle">
        <EmptyState
          icon={Truck}
          title="This vehicle could not be loaded"
          description="It may have been removed, or the link may be wrong."
        />
      </PageContainer>
    );
  }

  return (
    <VehicleFormDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      vehicle={query.data}
      pending={updateVehicle.isPending}
      onSubmit={async (values) => {
        await updateVehicle.mutateAsync(values);
        close();
      }}
    />
  );
}
