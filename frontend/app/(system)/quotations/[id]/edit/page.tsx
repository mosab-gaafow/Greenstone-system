'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/data-display/empty-state';
import { QuotationForm } from '@/features/quotations/components/quotation-form';
import { useQuotation, useUpdateQuotation } from '@/features/quotations/hooks/use-quotations';

export default function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const query = useQuotation(id);
  const updateQuotation = useUpdateQuotation(id);

  if (query.isPending) {
    return (
      <PageContainer title="Edit quotation">
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (query.isError) {
    return (
      <PageContainer title="Edit quotation">
        <EmptyState
          icon={FileText}
          title="This quotation could not be loaded"
          description="It may have been removed, or the link may be wrong."
        />
      </PageContainer>
    );
  }

  if (query.data.status !== 'DRAFT') {
    return (
      <PageContainer title="Edit quotation">
        <EmptyState
          icon={FileText}
          title="Only a draft quotation can be edited"
          description={`${query.data.quotationNumber} is ${query.data.status.toLowerCase()} and can no longer be changed.`}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={`Edit ${query.data.quotationNumber}`}
      description="Update the customer or items while this quotation is still a draft."
    >
      <div className="max-w-3xl">
        <QuotationForm
          quotation={query.data}
          pending={updateQuotation.isPending}
          onSubmit={async (values) => {
            await updateQuotation.mutateAsync(values);
            router.push(`/quotations/${id}`);
          }}
        />
      </div>
    </PageContainer>
  );
}
