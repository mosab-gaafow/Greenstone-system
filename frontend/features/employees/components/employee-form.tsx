'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, UserRound, Wallet } from 'lucide-react';
import { TextField } from '@/components/forms/text-field';
import { SelectField } from '@/components/forms/select-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { employeeFormSchema, type EmployeeFormValues } from '../schemas/employee.schema';
import { PAYMENT_METHOD_OPTIONS, SALARY_FREQUENCY_OPTIONS, type Employee } from '../types/employee.types';

interface EmployeeFormProps {
  employee?: Employee;
  onSubmit: (values: EmployeeFormValues) => Promise<unknown>;
  pending: boolean;
  /** Defaults to navigating back. A Sheet/Dialog host should close itself instead. */
  onCancel?: () => void;
}

export function EmployeeForm({ employee, onSubmit, pending, onCancel }: EmployeeFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: employee?.name ?? '',
      phone: employee?.phone ?? '',
      nationalId: employee?.nationalId ?? '',
      jobTitle: employee?.jobTitle ?? '',
      salaryFrequency: employee?.salaryFrequency ?? 'WEEKLY',
      salaryAmount: employee?.salaryAmount ?? '',
      paymentMethod: employee?.paymentMethod ?? 'CASH',
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
          label="Employee name"
          required
          placeholder="e.g. Wanjiku Njoroge"
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

        <TextField
          id="jobTitle"
          label="Job title"
          required
          placeholder="e.g. Block producer"
          error={errors.jobTitle?.message}
          {...register('jobTitle')}
        />
      </FormSection>

      <FormSection title="Salary" icon={Wallet}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="salaryFrequency"
            control={control}
            render={({ field }) => (
              <SelectField
                id="salaryFrequency"
                label="Salary frequency"
                required
                value={field.value}
                onChange={field.onChange}
                options={SALARY_FREQUENCY_OPTIONS}
                error={errors.salaryFrequency?.message}
              />
            )}
          />

          <TextField
            id="salaryAmount"
            label="Salary amount"
            required
            type="text"
            inputMode="decimal"
            placeholder="e.g. 3500.00"
            hint="KES, up to two decimal places."
            error={errors.salaryAmount?.message}
            {...register('salaryAmount')}
          />
        </div>

        <Controller
          name="paymentMethod"
          control={control}
          render={({ field }) => (
            <SelectField
              id="paymentMethod"
              label="Payment method"
              required
              value={field.value}
              onChange={field.onChange}
              options={PAYMENT_METHOD_OPTIONS}
              error={errors.paymentMethod?.message}
            />
          )}
        />
      </FormSection>

      <FormActions
        submitLabel={employee ? 'Save changes' : 'Save employee'}
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
