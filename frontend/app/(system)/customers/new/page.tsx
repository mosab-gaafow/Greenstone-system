'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { CustomerForm } from '@/features/customers/components/customer-form';
import { useCreateCustomer } from '@/features/customers/hooks/use-customers';

export default function NewCustomerPage() {
  const router = useRouter();
  const createCustomer = useCreateCustomer();

  return (
    <PageContainer
      title="Add customer"
      description="You can add their building sites once the customer is saved."
    >
      <CustomerForm
        pending={createCustomer.isPending}
        onSubmit={async (values) => {
          const customer = await createCustomer.mutateAsync(values);
          router.push(`/customers/${customer.id}`);
        }}
      />
    </PageContainer>
  );
}
