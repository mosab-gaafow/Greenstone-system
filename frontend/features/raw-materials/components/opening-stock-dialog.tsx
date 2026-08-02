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
  openingStockFormSchema,
  type OpeningStockFormValues,
} from '../schemas/raw-material.schema';

interface OpeningStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OpeningStockFormValues) => Promise<unknown>;
  pending: boolean;
}

/** Sets the raw-material balance to an absolute quantity — see business-blueprint section 2.15. */
export function OpeningStockDialog({ open, onOpenChange, onSubmit, pending }: OpeningStockDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpeningStockFormValues>({
    resolver: zodResolver(openingStockFormSchema),
    defaultValues: { quantity: '', reason: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ quantity: '', reason: '' });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set opening stock</DialogTitle>
          <DialogDescription>
            Sets the balance to this exact quantity. Entered once during production setup, and
            available afterwards as a traceable correction.
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
            type="text"
            inputMode="decimal"
            placeholder="e.g. 1000.500"
            hint="Up to three decimal places."
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
