'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Building2, FileText } from 'lucide-react';
import { TextField } from '@/components/forms/text-field';
import { TextareaField } from '@/components/forms/textarea-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { settingsFormSchema, type SettingsFormValues } from '../schemas/settings.schema';
import type { CompanySettings } from '../types/settings.types';

interface SettingsFormProps {
  settings: CompanySettings;
  onSubmit: (values: SettingsFormValues) => Promise<unknown>;
  pending: boolean;
}

export function SettingsForm({ settings, onSubmit, pending }: SettingsFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      companyName: settings.companyName ?? '',
      address: settings.address ?? '',
      phone: settings.phone ?? '',
      email: settings.email ?? '',
      paymentDetails: settings.paymentDetails ?? '',
      footerNotes: settings.footerNotes ?? '',
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
                : 'The settings could not be saved. Please try again.',
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

      <FormSection title="Company details" icon={Building2}>
        <TextField
          id="companyName"
          label="Company name"
          placeholder="e.g. Greenstone Blocks Ltd"
          hint="Shown on invoices and receipts once those are built."
          error={errors.companyName?.message}
          {...register('companyName')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="phone"
            label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="07XX XXX XXX"
            hint="Optional."
            error={errors.phone?.message}
            {...register('phone')}
          />

          <TextField
            id="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="e.g. info@greenstone.co.ke"
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

      <FormSection title="Document details" icon={FileText}>
        <TextareaField
          id="paymentDetails"
          label="Payment details"
          placeholder="e.g. M-Pesa Paybill 000000, Account: Greenstone"
          hint="Shown on issued documents once invoicing is built. Optional."
          error={errors.paymentDetails?.message}
          {...register('paymentDetails')}
        />

        <TextareaField
          id="footerNotes"
          label="Footer notes"
          placeholder="e.g. Thank you for your business."
          hint="Optional."
          error={errors.footerNotes?.message}
          {...register('footerNotes')}
        />
      </FormSection>

      <FormActions submitLabel="Save settings" submitIcon={Save} pending={pending} />
    </form>
  );
}
