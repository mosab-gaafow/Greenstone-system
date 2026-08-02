'use client';

import { useRouter } from 'next/navigation';
import { CustomerFormDialog } from '@/features/customers/components/customer-form-dialog';
import { useCreateCustomer } from '@/features/customers/hooks/use-customers';

export default function NewCustomerPage() {
  const router = useRouter();
  const createCustomer = useCreateCustomer();

  return (
    <CustomerFormDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.push('/customers');
        }
      }}
      pending={createCustomer.isPending}
      onSubmit={async (values) => {
        const customer = await createCustomer.mutateAsync(values);
        router.push(`/customers/${customer.id}`);
      }}
    />
  );
}
