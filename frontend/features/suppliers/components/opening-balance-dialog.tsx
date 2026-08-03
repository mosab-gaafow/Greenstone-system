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
  supplierOpeningBalanceFormSchema,
  type SupplierOpeningBalanceFormValues,
} from '../schemas/supplier-balance.schema';
import type { SupplierOpeningBalanceDetail } from '../types/supplier-balance.types';

interface OpeningBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when an opening balance has already been entered. */
  existing?: SupplierOpeningBalanceDetail | undefined;
  onSubmit: (values: SupplierOpeningBalanceFormValues) => Promise<unknown>;
  pending: boolean;
}

/**
 * Sets or corrects a supplier's opening balance — money already owed before
 * this system started (business-blueprint section 2.18).
 *
 * There is only ever one opening balance per supplier — this dialog always
 * corrects it in place, never adds a second one. Mirrors
 * frontend/features/customers/components/opening-balance-dialog.tsx.
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
  } = useForm<SupplierOpeningBalanceFormValues>({
    resolver: zodResolver(supplierOpeningBalanceFormSchema),
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
            Money Greenstone already owed this supplier before this system started. Not a
            purchase or an expense — this sets the starting point the outstanding balance is
            calculated from.
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
            placeholder="e.g. 75000.00"
            hint="KES, zero or greater, up to two decimal places."
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
