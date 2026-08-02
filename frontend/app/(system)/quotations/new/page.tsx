'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { QuotationForm } from '@/features/quotations/components/quotation-form';
import { useCreateQuotation } from '@/features/quotations/hooks/use-quotations';

export default function NewQuotationPage() {
  const router = useRouter();
  const createQuotation = useCreateQuotation();

  return (
    <PageContainer title="Add quotation" description="Agree prices with a customer before an order.">
      <div className="max-w-3xl">
        <QuotationForm
          pending={createQuotation.isPending}
          onSubmit={async (values) => {
            const quotation = await createQuotation.mutateAsync(values);
            router.push(`/quotations/${quotation.id}`);
          }}
        />
      </div>
    </PageContainer>
  );
}
