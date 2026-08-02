'use client';

import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TextField } from '@/components/forms/text-field';
import { SearchableSelect } from '@/components/forms/searchable-select';
import { useActiveMeasurementUnitOptions } from '@/features/measurement-units/hooks/use-measurement-units';
import { rawMaterialFormSchema, type RawMaterialFormValues } from '../schemas/raw-material.schema';
import type { RawMaterial } from '../types/raw-material.types';

interface RawMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing raw material. */
  rawMaterial?: RawMaterial | undefined;
  onSubmit: (values: RawMaterialFormValues) => Promise<unknown>;
  pending: boolean;
}

/** Add/edit a raw material. See business-blueprint sections 2.12–2.14. */
export function RawMaterialDialog({
  open,
  onOpenChange,
  rawMaterial,
  onSubmit,
  pending,
}: RawMaterialDialogProps) {
  const unitsQuery = useActiveMeasurementUnitOptions();

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data?.measurementUnits ?? []).map((unit) => ({
        value: unit.id,
        label: unit.symbol ? `${unit.name} (${unit.symbol})` : unit.name,
      })),
    [unitsQuery.data],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RawMaterialFormValues>({
    resolver: zodResolver(rawMaterialFormSchema),
    defaultValues: { name: '', measurementUnitId: '', reorderLevel: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: rawMaterial?.name ?? '',
        measurementUnitId: rawMaterial?.measurementUnitId ?? '',
        reorderLevel: rawMaterial?.reorderLevel ?? '',
      });
    }
  }, [open, rawMaterial, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rawMaterial ? 'Edit raw material' : 'Add raw material'}</DialogTitle>
          <DialogDescription>
            Cement, dust, pumice, or another configured material.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
          noValidate
        >
          <TextField
            id="name"
            label="Name"
            required
            placeholder="Cement"
            error={errors.name?.message}
            {...register('name')}
          />

          <Controller
            name="measurementUnitId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                id="measurementUnitId"
                label="Measurement unit"
                required
                value={field.value}
                onChange={field.onChange}
                options={unitOptions}
                placeholder={unitsQuery.isPending ? 'Loading units…' : 'Select a unit'}
                searchPlaceholder="Search units"
                emptyMessage={
                  unitsQuery.isError ? 'Units could not be loaded.' : 'No active units found.'
                }
                disabled={unitsQuery.isPending}
                error={errors.measurementUnitId?.message}
              />
            )}
          />

          <TextField
            id="reorderLevel"
            label="Reorder level"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 50.000"
            hint="Optional. A low-stock alert only activates once this is set."
            error={errors.reorderLevel?.message}
            {...register('reorderLevel')}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {rawMaterial ? 'Save raw material' : 'Add raw material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
