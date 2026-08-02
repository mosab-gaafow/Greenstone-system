'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/data-display/empty-state';
import { OrderForm } from '@/features/orders/components/order-form';
import { useCreateOrder } from '@/features/orders/hooks/use-orders';
import { useQuotation } from '@/features/quotations/hooks/use-quotations';

function NewOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceQuotationId = searchParams.get('sourceQuotationId') ?? undefined;
  const createOrder = useCreateOrder();

  const quotationQuery = useQuotation(sourceQuotationId);

  if (sourceQuotationId && quotationQuery.isPending) {
    return (
      <PageContainer title="Add order">
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (sourceQuotationId && quotationQuery.isError) {
    return (
      <PageContainer title="Add order">
        <EmptyState
          icon={FileText}
          title="This quotation could not be loaded"
          description="It may have been removed, or the link may be wrong."
        />
      </PageContainer>
    );
  }

  if (sourceQuotationId && quotationQuery.data && quotationQuery.data.status !== 'ACCEPTED') {
    return (
      <PageContainer title="Add order">
        <EmptyState
          icon={FileText}
          title="Only an accepted quotation can become an order"
          description={`${quotationQuery.data.quotationNumber} is ${quotationQuery.data.status.toLowerCase()}.`}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Add order"
      description={
        quotationQuery.data
          ? `Converting ${quotationQuery.data.quotationNumber} into an order.`
          : 'Create a direct order for a customer.'
      }
    >
      <div className="max-w-3xl">
        <OrderForm
          sourceQuotation={quotationQuery.data}
          pending={createOrder.isPending}
          onSubmit={async (values) => {
            const order = await createOrder.mutateAsync(values);
            router.push(`/orders/${order.id}`);
          }}
        />
      </div>
    </PageContainer>
  );
}

export default function NewOrderPage() {
  return (
    // useSearchParams needs a Suspense boundary while prerendering.
    <Suspense
      fallback={
        <PageContainer title="Add order">
          <div className="max-w-3xl space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </PageContainer>
      }
    >
      <NewOrderPageContent />
    </Suspense>
  );
}
