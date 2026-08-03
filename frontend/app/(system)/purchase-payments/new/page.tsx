'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PurchasePaymentForm } from '@/features/purchase-payments/components/purchase-payment-form';
import { useCreatePurchasePayment } from '@/features/purchase-payments/hooks/use-purchase-payments';

export default function NewPurchasePaymentPage() {
  const router = useRouter();
  const createPayment = useCreatePurchasePayment();

  return (
    <PageContainer title="Add purchase payment" description="Record a payment made to a supplier.">
      <div className="max-w-3xl">
        <PurchasePaymentForm
          pending={createPayment.isPending}
          onSubmit={async (values, evidenceFile) => {
            const payment = await createPayment.mutateAsync({ values, evidenceFile });
            router.push(`/purchase-payments/${payment.id}`);
          }}
        />
      </div>
    </PageContainer>
  );
}
