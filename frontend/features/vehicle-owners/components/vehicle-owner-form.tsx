'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Save } from 'lucide-react';
import { TextField } from '@/components/forms/text-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { vehicleOwnerFormSchema, type VehicleOwnerFormValues } from '../schemas/vehicle-owner.schema';
import type { VehicleOwner } from '../types/vehicle-owner.types';

interface VehicleOwnerFormProps {
  vehicleOwner?: VehicleOwner;
  onSubmit: (values: VehicleOwnerFormValues) => Promise<unknown>;
  pending: boolean;
  /** Defaults to navigating back. A Sheet/Dialog host should close itself instead. */
  onCancel?: () => void;
}

/**
 * A Vehicle Owner is a separate master-data record from a Driver, even when
 * the same real person is both — see business-blueprint section 2.20.
 */
export function VehicleOwnerForm({
  vehicleOwner,
  onSubmit,
  pending,
  onCancel,
}: VehicleOwnerFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleOwnerFormValues>({
    resolver: zodResolver(vehicleOwnerFormSchema),
    defaultValues: {
      name: vehicleOwner?.name ?? '',
      phone: vehicleOwner?.phone ?? '',
      nationalId: vehicleOwner?.nationalId ?? '',
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

      <FormSection title="Basic information" icon={Building2}>
        <TextField
          id="name"
          label="Vehicle owner name"
          required
          placeholder="e.g. Kamau Transporters"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="phone"
            label="Phone number"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="07XX XXX XXX"
            hint="Kenyan mobile format."
            error={errors.phone?.message}
            {...register('phone')}
          />

          <TextField
            id="nationalId"
            label="National ID"
            placeholder="e.g. 23456789"
            hint="Optional."
            error={errors.nationalId?.message}
            {...register('nationalId')}
          />
        </div>
      </FormSection>

      <FormActions
        submitLabel={vehicleOwner ? 'Save changes' : 'Save vehicle owner'}
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
