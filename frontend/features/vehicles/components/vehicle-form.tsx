'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Save, Truck } from 'lucide-react';
import { SearchableSelect } from '@/components/forms/searchable-select';
import { TextField } from '@/components/forms/text-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import * as vehicleOwnersApi from '@/features/vehicle-owners/api/vehicle-owners.api';
import { vehicleFormSchema, type VehicleFormValues } from '../schemas/vehicle.schema';
import type { Vehicle } from '../types/vehicle.types';

interface VehicleFormProps {
  vehicle?: Vehicle;
  onSubmit: (values: VehicleFormValues) => Promise<unknown>;
  pending: boolean;
  /** Defaults to navigating back. A Sheet/Dialog host should close itself instead. */
  onCancel?: () => void;
}

export function VehicleForm({ vehicle, onSubmit, pending, onCancel }: VehicleFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const vehicleOwnersQuery = useQuery({
    queryKey: ['vehicles', 'vehicle-owner-options'],
    queryFn: () => vehicleOwnersApi.fetchVehicleOwners({ page: 1, pageSize: 100, isActive: true }),
  });

  const vehicleOwnerOptions = useMemo(
    () =>
      (vehicleOwnersQuery.data?.vehicleOwners ?? []).map((owner) => ({
        value: owner.id,
        label: owner.name,
      })),
    [vehicleOwnersQuery.data],
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      registrationNumber: vehicle?.registrationNumber ?? '',
      vehicleType: vehicle?.vehicleType ?? '',
      vehicleOwnerId: vehicle?.vehicleOwnerId ?? '',
    },
  });

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(async (values) => {
          setSubmitError(null);

          try {
            await onSubmit(values);
          } catch (error) {
            setSubmitError(
              error instanceof ApiError
                ? error.message
                : 'The details could not be saved. Please try again.',
            );
          }
        })(event);
      }}
      className="space-y-6"
      noValidate
    >
      {submitError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <FormSection title="Vehicle details" icon={Truck}>
        <TextField
          id="registrationNumber"
          label="Registration number"
          required
          placeholder="e.g. KDA 123X"
          error={errors.registrationNumber?.message}
          {...register('registrationNumber')}
        />

        <TextField
          id="vehicleType"
          label="Vehicle type"
          required
          placeholder="e.g. Truck, Lorry"
          error={errors.vehicleType?.message}
          {...register('vehicleType')}
        />

        <Controller
          name="vehicleOwnerId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              id="vehicleOwnerId"
              label="Vehicle owner"
              required
              value={field.value}
              onChange={field.onChange}
              options={vehicleOwnerOptions}
              placeholder={
                vehicleOwnersQuery.isPending ? 'Loading vehicle owners…' : 'Select a vehicle owner'
              }
              searchPlaceholder="Search vehicle owners"
              emptyMessage={
                vehicleOwnersQuery.isError
                  ? 'Vehicle owners could not be loaded.'
                  : 'No active vehicle owners found.'
              }
              disabled={vehicleOwnersQuery.isPending}
              error={errors.vehicleOwnerId?.message}
            />
          )}
        />
      </FormSection>

      <FormActions
        submitLabel={vehicle ? 'Save changes' : 'Save vehicle'}
        submitIcon={Save}
        pending={pending}
        onCancel={() => {
          if (onCancel) {
            onCancel();
          } else {
            router.back();
          }
        }}
      />
    </form>
  );
}
