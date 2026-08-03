'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/data-display/empty-state';
import { VehicleOwnerFormDialog } from '@/features/vehicle-owners/components/vehicle-owner-form-dialog';
import { useUpdateVehicleOwner, useVehicleOwner } from '@/features/vehicle-owners/hooks/use-vehicle-owners';

export default function EditVehicleOwnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const query = useVehicleOwner(id);
  const updateVehicleOwner = useUpdateVehicleOwner(id);

  function close() {
    router.push(`/vehicle-owners/${id}`);
  }

  if (query.isPending) {
    return (
      <PageContainer title="Edit vehicle owner">
        <div className="max-w-xl space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (query.isError) {
    return (
      <PageContainer title="Edit vehicle owner">
        <EmptyState
          icon={Building2}
          title="This vehicle owner could not be loaded"
          description="They may have been removed, or the link may be wrong."
        />
      </PageContainer>
    );
  }

  return (
    <VehicleOwnerFormDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      vehicleOwner={query.data}
      pending={updateVehicleOwner.isPending}
      onSubmit={async (values) => {
        await updateVehicleOwner.mutateAsync(values);
        close();
      }}
    />
  );
}
