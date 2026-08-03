'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PurchaseForm } from '@/features/purchases/components/purchase-form';
import { useCreatePurchase } from '@/features/purchases/hooks/use-purchases';

export default function NewPurchasePage() {
  const router = useRouter();
  const createPurchase = useCreatePurchase();

  return (
    <PageContainer title="Add purchase" description="Record raw materials received from a supplier.">
      <div className="max-w-3xl">
        <PurchaseForm
          pending={createPurchase.isPending}
          onSubmit={async (values) => {
            const purchase = await createPurchase.mutateAsync(values);
            router.push(`/purchases/${purchase.id}`);
          }}
        />
      </div>
    </PageContainer>
  );
}
