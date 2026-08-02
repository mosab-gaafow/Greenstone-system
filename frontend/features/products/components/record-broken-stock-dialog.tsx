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
  recordBrokenStockFormSchema,
  type RecordBrokenStockFormInput,
  type RecordBrokenStockFormValues,
} from '../schemas/finished-stock.schema';

interface RecordBrokenStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RecordBrokenStockFormValues) => Promise<unknown>;
  pending: boolean;
}

/**
 * Records broken finished stock — see business-blueprint section 2.11. This
 * always decrements physical stock by the same quantity, in the same
 * transaction as the broken-product record.
 */
export function RecordBrokenStockDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: RecordBrokenStockDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecordBrokenStockFormInput, unknown, RecordBrokenStockFormValues>({
    resolver: zodResolver(recordBrokenStockFormSchema),
    defaultValues: { quantity: 1, reason: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ quantity: 1, reason: '' });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record broken stock</DialogTitle>
          <DialogDescription>
            Reduces physical stock by this quantity and keeps a permanent broken-product record.
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
            min={1}
            step={1}
            error={errors.quantity?.message}
            {...register('quantity')}
          />

          <TextareaField
            id="reason"
            label="Reason"
            placeholder="Optional — e.g. damaged during a stock count."
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
            <Button type="submit" variant="destructive" className="h-11" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
