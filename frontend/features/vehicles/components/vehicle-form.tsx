'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Truck, Weight } from 'lucide-react';
import { TextField } from '@/components/forms/text-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { vehicleFormSchema, type VehicleFormValues } from '../schemas/vehicle.schema';
import type { Vehicle } from '../types/vehicle.types';

interface VehicleFormProps {
  vehicle?: Vehicle;
  onSubmit: (values: VehicleFormValues) => Promise<unknown>;
  pending: boolean;
  /** Defaults to navigating back. A Sheet/Dialog host should close itself instead. */
  onCancel?: () => void;
}

/**
 * Same formula the backend uses, for an immediate on-screen preview only.
 * The backend remains the sole authority for the saved value — this number
 * is never sent to the server.
 */
const DEFAULT_CALCULATION_FACTOR = 1100;

export function VehicleForm({ vehicle, onSubmit, pending, onCancel }: VehicleFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      registrationNumber: vehicle?.registrationNumber ?? '',
      vehicleType: vehicle?.vehicleType ?? '',
      truckLengthM: vehicle?.truckLengthM ?? '',
      truckWidthM: vehicle?.truckWidthM ?? '',
      truckHeightM: vehicle?.truckHeightM ?? '',
    },
  });

  const length = watch('truckLengthM');
  const width = watch('truckWidthM');
  const height = watch('truckHeightM');

  const estimate = useMemo(() => {
    const l = Number(length);
    const w = Number(width);
    const h = Number(height);

    if (!length || !width || !height || !Number.isFinite(l) || !Number.isFinite(w) || !Number.isFinite(h)) {
      return null;
    }

    const kg = l * w * h * DEFAULT_CALCULATION_FACTOR;
    return { kg, tonnes: kg / 1000 };
  }, [length, width, height]);

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
      </FormSection>

      <FormSection
        title="Load capacity"
        description="All three dimensions are required to calculate the truck's load capacity."
        icon={Weight}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            id="truckLengthM"
            label="Length (m)"
            required
            type="text"
            inputMode="decimal"
            placeholder="e.g. 6.00"
            error={errors.truckLengthM?.message}
            {...register('truckLengthM')}
          />

          <TextField
            id="truckWidthM"
            label="Width (m)"
            required
            type="text"
            inputMode="decimal"
            placeholder="e.g. 2.00"
            error={errors.truckWidthM?.message}
            {...register('truckWidthM')}
          />

          <TextField
            id="truckHeightM"
            label="Height (m)"
            required
            type="text"
            inputMode="decimal"
            placeholder="e.g. 1.50"
            error={errors.truckHeightM?.message}
            {...register('truckHeightM')}
          />
        </div>

        <TextField
          id="calculationFactor"
          label="Calculation factor"
          value={vehicle?.calculationFactor ?? String(DEFAULT_CALCULATION_FACTOR)}
          hint="Fixed by the system. Not editable here."
          disabled
          readOnly
        />

        {estimate && (
          <div className="bg-muted rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">Estimated load: </span>
            <span className="font-semibold tabular-nums">
              {estimate.kg.toLocaleString()} kg ({estimate.tonnes.toLocaleString()} t)
            </span>
            <p className="text-muted-foreground mt-1 text-xs">
              Preview only — the saved figure always comes from the backend.
            </p>
          </div>
        )}
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
