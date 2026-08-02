'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Warehouse } from 'lucide-react';
import { TextField } from '@/components/forms/text-field';
import { TextareaField } from '@/components/forms/textarea-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { supplierFormSchema, type SupplierFormValues } from '../schemas/supplier.schema';
import type { Supplier } from '../types/supplier.types';

interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (values: SupplierFormValues) => Promise<unknown>;
  pending: boolean;
  /** Defaults to navigating back. A Sheet/Dialog host should close itself instead. */
  onCancel?: () => void;
}

export function SupplierForm({ supplier, onSubmit, pending, onCancel }: SupplierFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: supplier?.name ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
      address: supplier?.address ?? '',
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

      <FormSection title="Supplier information" icon={Warehouse}>
        <TextField
          id="name"
          label="Supplier name"
          required
          placeholder="e.g. Rift Valley Cement"
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
            id="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="e.g. sales@supplier.co.ke"
            hint="Optional."
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <TextareaField
          id="address"
          label="Address"
          placeholder="e.g. Industrial Area, Nairobi"
          hint="Optional."
          error={errors.address?.message}
          {...register('address')}
        />
      </FormSection>

      <FormActions
        submitLabel={supplier ? 'Save changes' : 'Save supplier'}
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
