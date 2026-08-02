'use client';

import { UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { CustomerForm } from './customer-form';
import type { Customer } from '../types/customer.types';
import type { CustomerFormValues } from '../schemas/customer.schema';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  pending: boolean;
  onSubmit: (values: CustomerFormValues) => Promise<unknown>;
}

/**
 * Add/Edit Customer — a centred Dialog on desktop, a full-screen Sheet below
 * `sm`. The media query matches Tailwind's own `sm:` breakpoint exactly, so
 * `FormActions`' responsive sticky-footer behaviour and this component's
 * Dialog/Sheet choice never disagree about what counts as "desktop."
 */
export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  pending,
  onSubmit,
}: CustomerFormDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const title = customer ? `Edit ${customer.name}` : 'Add customer';
  const description = customer
    ? 'Update the customer details.'
    : 'You can add their building sites once the customer is saved.';

  const form = (
    <CustomerForm
      customer={customer}
      pending={pending}
      onSubmit={onSubmit}
      onCancel={() => {
        onOpenChange(false);
      }}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <div className="flex items-start gap-3 border-b p-6">
            <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
              <UserPlus className="size-5" aria-hidden />
            </span>
            <div className="space-y-1 pr-8">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">{form}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b">
          <div className="flex items-center gap-3">
            <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
              <UserPlus className="size-4" aria-hidden />
            </span>
            <div>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 [padding-bottom:env(safe-area-inset-bottom)]">
          {form}
        </div>
      </SheetContent>
    </Sheet>
  );
}
