'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@/components/forms/text-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { customerFormSchema, type CustomerFormValues } from '../schemas/customer.schema';
import type { Customer } from '../types/customer.types';

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (values: CustomerFormValues) => Promise<unknown>;
  pending: boolean;
}

export function CustomerForm({ customer, onSubmit, pending }: CustomerFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
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
            // A rejected duplicate arrives as a business-rule error with a
            // message naming the record it clashes with. Shown on the form
            // rather than only as a toast, which disappears before it can be
            // read and acted on.
            setSubmitError(
              error instanceof ApiError
                ? error.message
                : 'The details could not be saved. Please try again.',
            );
          }
        })(event);
      }}
      className="max-w-xl space-y-8"
      noValidate
    >
      {submitError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <FormSection title="Customer details">
        <TextField
          id="name"
          label="Customer name"
          required
          placeholder="Kamau Contractors"
          error={errors.name?.message}
          {...register('name')}
        />

        <TextField
          id="phone"
          label="Phone number"
          required
          // Opens the phone keypad on a mobile device.
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0722 123 456"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <TextField
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Optional"
          hint="Used for sending quotations and invoices."
          error={errors.email?.message}
          {...register('email')}
        />
      </FormSection>

      <FormActions
        submitLabel={customer ? 'Save changes' : 'Add customer'}
        pending={pending}
        onCancel={() => {
          router.back();
        }}
      />
    </form>
  );
}
