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
  openingFinishedStockFormSchema,
  type OpeningFinishedStockFormInput,
  type OpeningFinishedStockFormValues,
} from '../schemas/finished-stock.schema';

interface OpeningFinishedStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OpeningFinishedStockFormValues) => Promise<unknown>;
  pending: boolean;
}

/** Sets physical finished stock to an absolute quantity — see business-blueprint section 2.10. */
export function OpeningFinishedStockDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: OpeningFinishedStockDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpeningFinishedStockFormInput, unknown, OpeningFinishedStockFormValues>({
    resolver: zodResolver(openingFinishedStockFormSchema),
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
          <DialogTitle>Set opening stock</DialogTitle>
          <DialogDescription>
            Sets physical stock to this exact quantity of pieces. Entered once during production
            setup, and available afterwards as a traceable correction.
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
            min={0}
            step={1}
            error={errors.quantity?.message}
            {...register('quantity')}
          />

          <TextareaField
            id="reason"
            label="Reason"
            placeholder="Optional — e.g. carried over from the previous system."
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
