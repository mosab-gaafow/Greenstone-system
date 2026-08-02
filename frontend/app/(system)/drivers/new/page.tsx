'use client';

import { useRouter } from 'next/navigation';
import { DriverFormDialog } from '@/features/drivers/components/driver-form-dialog';
import { useCreateDriver } from '@/features/drivers/hooks/use-drivers';

export default function NewDriverPage() {
  const router = useRouter();
  const createDriver = useCreateDriver();

  return (
    <DriverFormDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.push('/drivers');
        }
      }}
      pending={createDriver.isPending}
      onSubmit={async (values) => {
        const driver = await createDriver.mutateAsync(values);
        router.push(`/drivers/${driver.id}`);
      }}
    />
  );
}
