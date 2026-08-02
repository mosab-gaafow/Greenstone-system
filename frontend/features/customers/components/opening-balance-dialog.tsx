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
  openingBalanceFormSchema,
  type OpeningBalanceFormValues,
} from '../schemas/customer-credit.schema';
import type { OpeningBalanceDetail } from '../types/customer-credit.types';

interface OpeningBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when an opening balance has already been entered. */
  existing?: OpeningBalanceDetail | undefined;
  onSubmit: (values: OpeningBalanceFormValues) => Promise<unknown>;
  pending: boolean;
}

/**
 * Sets or corrects a customer's opening balance.
 *
 * There is only ever one opening balance per customer — this dialog always
 * corrects it in place, never adds a second one. See business-blueprint
 * section 2.25.
 */
export function OpeningBalanceDialog({
  open,
  onOpenChange,
  existing,
  onSubmit,
  pending,
}: OpeningBalanceDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpeningBalanceFormValues>({
    resolver: zodResolver(openingBalanceFormSchema),
    defaultValues: { amount: '', effectiveDate: '', reason: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        amount: existing?.amount ?? '',
        effectiveDate: existing?.effectiveDate.slice(0, 10) ?? '',
        reason: '',
      });
    }
  }, [open, existing, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Correct opening balance' : 'Set opening balance'}</DialogTitle>
          <DialogDescription>
            Entered once during production setup. Not an invoice — this sets the
            starting point the customer&apos;s credit status is calculated from.
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
            id="amount"
            label="Opening balance"
            required
            type="text"
            inputMode="decimal"
            placeholder="e.g. 250000.00"
            hint="KES, up to two decimal places."
            error={errors.amount?.message}
            {...register('amount')}
          />

          <TextField
            id="effectiveDate"
            label="Effective date"
            required
            type="date"
            error={errors.effectiveDate?.message}
            {...register('effectiveDate')}
          />

          <TextareaField
            id="reason"
            label="Reason"
            required
            placeholder="Why this figure — e.g. carried over from the previous system."
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
