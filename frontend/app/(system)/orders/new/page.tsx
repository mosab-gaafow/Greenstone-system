'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { OrderForm } from '@/features/orders/components/order-form';
import { useCreateOrder } from '@/features/orders/hooks/use-orders';

export default function NewOrderPage() {
  const router = useRouter();
  const createOrder = useCreateOrder();

  return (
    <PageContainer title="Add order" description="Create a direct order for a customer.">
      <div className="max-w-3xl">
        <OrderForm
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
