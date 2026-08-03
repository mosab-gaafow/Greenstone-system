'use client';

import { useRouter } from 'next/navigation';
import { VehicleOwnerFormDialog } from '@/features/vehicle-owners/components/vehicle-owner-form-dialog';
import { useCreateVehicleOwner } from '@/features/vehicle-owners/hooks/use-vehicle-owners';

export default function NewVehicleOwnerPage() {
  const router = useRouter();
  const createVehicleOwner = useCreateVehicleOwner();

  return (
    <VehicleOwnerFormDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.push('/vehicle-owners');
        }
      }}
      pending={createVehicleOwner.isPending}
      onSubmit={async (values) => {
        const vehicleOwner = await createVehicleOwner.mutateAsync(values);
        router.push(`/vehicle-owners/${vehicleOwner.id}`);
      }}
    />
  );
}
