'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, UserRound } from 'lucide-react';
import { TextField } from '@/components/forms/text-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { driverFormSchema, type DriverFormValues } from '../schemas/driver.schema';
import type { Driver } from '../types/driver.types';

interface DriverFormProps {
  driver?: Driver;
  onSubmit: (values: DriverFormValues) => Promise<unknown>;
  pending: boolean;
  /** Defaults to navigating back. A Sheet/Dialog host should close itself instead. */
  onCancel?: () => void;
}

export function DriverForm({ driver, onSubmit, pending, onCancel }: DriverFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      name: driver?.name ?? '',
      phone: driver?.phone ?? '',
      nationalId: driver?.nationalId ?? '',
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

      <FormSection title="Basic information" icon={UserRound}>
        <TextField
          id="name"
          label="Driver name"
          required
          placeholder="e.g. Kamau Mwangi"
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
            required
            placeholder="e.g. 23456789"
            error={errors.nationalId?.message}
            {...register('nationalId')}
          />
        </div>
      </FormSection>

      <FormActions
        submitLabel={driver ? 'Save changes' : 'Save driver'}
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
