'use client';

import { useRouter } from 'next/navigation';
import { SupplierFormDialog } from '@/features/suppliers/components/supplier-form-dialog';
import { useCreateSupplier } from '@/features/suppliers/hooks/use-suppliers';

export default function NewSupplierPage() {
  const router = useRouter();
  const createSupplier = useCreateSupplier();

  return (
    <SupplierFormDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.push('/suppliers');
        }
      }}
      pending={createSupplier.isPending}
      onSubmit={async (values) => {
        const supplier = await createSupplier.mutateAsync(values);
        router.push(`/suppliers/${supplier.id}`);
      }}
    />
  );
}
