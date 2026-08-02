'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/data-display/empty-state';
import { DriverFormDialog } from '@/features/drivers/components/driver-form-dialog';
import { useDriver, useUpdateDriver } from '@/features/drivers/hooks/use-drivers';

export default function EditDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const query = useDriver(id);
  const updateDriver = useUpdateDriver(id);

  function close() {
    router.push(`/drivers/${id}`);
  }

  if (query.isPending) {
    return (
      <PageContainer title="Edit driver">
        <div className="max-w-xl space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (query.isError) {
    return (
      <PageContainer title="Edit driver">
        <EmptyState
          icon={Truck}
          title="This driver could not be loaded"
          description="They may have been removed, or the link may be wrong."
        />
      </PageContainer>
    );
  }

  return (
    <DriverFormDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      driver={query.data}
      pending={updateDriver.isPending}
      onSubmit={async (values) => {
        await updateDriver.mutateAsync(values);
        close();
      }}
    />
  );
}
