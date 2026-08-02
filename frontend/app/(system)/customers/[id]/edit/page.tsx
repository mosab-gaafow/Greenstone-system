'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/data-display/empty-state';
import { CustomerFormDialog } from '@/features/customers/components/customer-form-dialog';
import { useCustomer, useUpdateCustomer } from '@/features/customers/hooks/use-customers';

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const query = useCustomer(id);
  const updateCustomer = useUpdateCustomer(id);

  function close() {
    router.push(`/customers/${id}`);
  }

  if (query.isPending) {
    return (
      <PageContainer title="Edit customer">
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
      <PageContainer title="Edit customer">
        <EmptyState
          icon={Users}
          title="This customer could not be loaded"
          description="They may have been removed, or the link may be wrong."
        />
      </PageContainer>
    );
  }

  return (
    <CustomerFormDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      customer={query.data}
      pending={updateCustomer.isPending}
      onSubmit={async (values) => {
        await updateCustomer.mutateAsync(values);
        close();
      }}
    />
  );
}
