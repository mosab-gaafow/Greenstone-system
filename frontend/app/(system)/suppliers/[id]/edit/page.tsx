'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Warehouse } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/data-display/empty-state';
import { SupplierFormDialog } from '@/features/suppliers/components/supplier-form-dialog';
import { useSupplier, useUpdateSupplier } from '@/features/suppliers/hooks/use-suppliers';

export default function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const query = useSupplier(id);
  const updateSupplier = useUpdateSupplier(id);

  function close() {
    router.push(`/suppliers/${id}`);
  }

  if (query.isPending) {
    return (
      <PageContainer title="Edit supplier">
        <div className="max-w-xl space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (query.isError) {
    return (
      <PageContainer title="Edit supplier">
        <EmptyState
          icon={Warehouse}
          title="This supplier could not be loaded"
          description="It may have been removed, or the link may be wrong."
        />
      </PageContainer>
    );
  }

  return (
    <SupplierFormDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      supplier={query.data}
      pending={updateSupplier.isPending}
      onSubmit={async (values) => {
        await updateSupplier.mutateAsync(values);
        close();
      }}
    />
  );
}
