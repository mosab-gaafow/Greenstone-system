'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import {
  measurementUnitFormSchema,
  type MeasurementUnitFormValues,
} from '../schemas/measurement-unit.schema';
import type { MeasurementUnit } from '../types/measurement-unit.types';

interface MeasurementUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing unit. */
  unit?: MeasurementUnit | undefined;
  onSubmit: (values: MeasurementUnitFormValues) => Promise<unknown>;
  pending: boolean;
}

/** Add/edit a raw-material measurement unit. See business-blueprint section 2.13. */
export function MeasurementUnitDialog({
  open,
  onOpenChange,
  unit,
  onSubmit,
  pending,
}: MeasurementUnitDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeasurementUnitFormValues>({
    resolver: zodResolver(measurementUnitFormSchema),
    defaultValues: { name: '', symbol: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ name: unit?.name ?? '', symbol: unit?.symbol ?? '' });
    }
  }, [open, unit, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{unit ? 'Edit unit' : 'Add unit'}</DialogTitle>
          <DialogDescription>
            Configurable measurement units for raw materials — bag, kilogram, tonne, load, cubic
            metre, or another unit Greenstone uses.
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
            placeholder="Bag"
            error={errors.name?.message}
            {...register('name')}
          />

          <TextField
            id="symbol"
            label="Symbol"
            placeholder="kg"
            hint="Optional, shown alongside quantities."
            error={errors.symbol?.message}
            {...register('symbol')}
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
              {unit ? 'Save unit' : 'Add unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
