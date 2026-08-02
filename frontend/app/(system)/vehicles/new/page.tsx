'use client';

import { useRouter } from 'next/navigation';
import { VehicleFormDialog } from '@/features/vehicles/components/vehicle-form-dialog';
import { useCreateVehicle } from '@/features/vehicles/hooks/use-vehicles';

export default function NewVehiclePage() {
  const router = useRouter();
  const createVehicle = useCreateVehicle();

  return (
    <VehicleFormDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.push('/vehicles');
        }
      }}
      pending={createVehicle.isPending}
      onSubmit={async (values) => {
        const vehicle = await createVehicle.mutateAsync(values);
        router.push(`/vehicles/${vehicle.id}`);
      }}
    />
  );
}
