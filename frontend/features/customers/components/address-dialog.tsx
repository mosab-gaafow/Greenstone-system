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
import { addressFormSchema, type AddressFormValues } from '../schemas/customer.schema';
import type { CustomerAddress } from '../types/customer.types';

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing site. */
  address?: CustomerAddress | undefined;
  onSubmit: (values: AddressFormValues) => Promise<unknown>;
  pending: boolean;
}

/**
 * Add or edit a building-site address.
 *
 * A dialog rather than a separate page: sites are short records usually managed
 * while looking at the customer, and a full page navigation would lose that
 * context.
 */
export function AddressDialog({
  open,
  onOpenChange,
  address,
  onSubmit,
  pending,
}: AddressDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: { label: '', addressLine: '', directions: '' },
  });

  // The dialog stays mounted between openings, so the fields are refilled each
  // time it opens — otherwise editing one site would show the previous one.
  useEffect(() => {
    if (open) {
      reset({
        label: address?.label ?? '',
        addressLine: address?.addressLine ?? '',
        directions: address?.directions ?? '',
      });
    }
  }, [open, address, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{address ? 'Edit site' : 'Add site'}</DialogTitle>
          <DialogDescription>
            A delivery goes to one site. Add every site this customer builds on.
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
            id="label"
            label="Site name"
            required
            placeholder="Kiambu Road site"
            hint="A short name the yard will recognise."
            error={errors.label?.message}
            {...register('label')}
          />

          <TextField
            id="addressLine"
            label="Address"
            required
            placeholder="Plot 44, Kiambu Road"
            error={errors.addressLine?.message}
            {...register('addressLine')}
          />

          <TextareaField
            id="directions"
            label="Directions for the driver"
            placeholder="Past the shell station, blue gate on the left."
            error={errors.directions?.message}
            {...register('directions')}
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
              {address ? 'Save site' : 'Add site'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
