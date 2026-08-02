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
import { TextareaField } from '@/components/forms/textarea-field';
import {
  adjustFinishedStockFormSchema,
  type AdjustFinishedStockFormInput,
  type AdjustFinishedStockFormValues,
} from '../schemas/finished-stock.schema';

interface AdjustFinishedStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AdjustFinishedStockFormValues) => Promise<unknown>;
  pending: boolean;
}

/** Applies a signed delta to physical finished stock, with a required reason. */
export function AdjustFinishedStockDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: AdjustFinishedStockDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustFinishedStockFormInput, unknown, AdjustFinishedStockFormValues>({
    resolver: zodResolver(adjustFinishedStockFormSchema),
    defaultValues: { quantity: 0, reason: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ quantity: 0, reason: '' });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            Enter a positive quantity to increase stock, or a negative quantity (e.g. -10) to
            decrease it. A reason is always required.
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
            id="quantity"
            label="Quantity"
            required
            type="number"
            inputMode="numeric"
            step={1}
            error={errors.quantity?.message}
            {...register('quantity')}
          />

          <TextareaField
            id="reason"
            label="Reason"
            required
            placeholder="Why this adjustment is needed."
            error={errors.reason?.message}
            {...register('reason')}
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
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
