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
  releaseCuringFormSchema,
  type ReleaseCuringFormInput,
  type ReleaseCuringFormValues,
} from '../schemas/curing.schema';

interface ReleaseCuringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantityEntering: number;
  onSubmit: (values: ReleaseCuringFormValues) => Promise<unknown>;
  pending: boolean;
}

/**
 * Releases a curing record. Order-allocated products become available for
 * the order; excess usable products enter general finished stock — see
 * business-blueprint section 2.8.
 */
export function ReleaseCuringDialog({
  open,
  onOpenChange,
  quantityEntering,
  onSubmit,
  pending,
}: ReleaseCuringDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReleaseCuringFormInput, unknown, ReleaseCuringFormValues>({
    resolver: zodResolver(releaseCuringFormSchema),
    defaultValues: { brokenQuantity: 0 },
  });

  useEffect(() => {
    if (open) {
      reset({ brokenQuantity: 0 });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Release curing</DialogTitle>
          <DialogDescription>
            {quantityEntering} pieces entered curing. Enter how many broke during curing — the
            rest releases now.
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
            id="brokenQuantity"
            label="Broken during curing"
            type="number"
            inputMode="numeric"
            min={0}
            max={quantityEntering}
            step={1}
            error={errors.brokenQuantity?.message}
            {...register('brokenQuantity')}
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
              Release
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
