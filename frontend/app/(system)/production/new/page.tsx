'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { ProductionForm } from '@/features/production/components/production-form';
import { useCreateProductionBatch } from '@/features/production/hooks/use-production';

export default function NewProductionPage() {
  const router = useRouter();
  const createProduction = useCreateProductionBatch();

  return (
    <PageContainer title="Add production" description="Record pallets produced for an order or general stock.">
      <div className="max-w-3xl">
        <ProductionForm
          pending={createProduction.isPending}
          onSubmit={async (values) => {
            const batch = await createProduction.mutateAsync(values);
            router.push(`/production/${batch.id}`);
          }}
        />
      </div>
    </PageContainer>
  );
}
