'use client';

import { Package } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ProductForm } from './product-form';
import type { Product } from '../types/product.types';
import type { ProductFormValues } from '../schemas/product.schema';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  pending: boolean;
  onSubmit: (values: ProductFormValues) => Promise<unknown>;
}

/**
 * Add/Edit Product — a centred Dialog on desktop, a full-screen Sheet below
 * `sm`. Same pattern as `CustomerFormDialog`, so every master-data form in the
 * system behaves the same way.
 */
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  pending,
  onSubmit,
}: ProductFormDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const title = product ? `Edit ${product.name}` : 'Add product';
  const description = product
    ? 'Update the product details.'
    : 'Add a product to the master list.';

  const form = (
    <ProductForm
      product={product}
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
              <Package className="size-5" aria-hidden />
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
      <SheetContent side="right" className="data-[side=right]:w-full flex flex-col gap-0 p-0">
        <SheetHeader className="border-b">
          <div className="flex items-center gap-3">
            <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Package className="size-4" aria-hidden />
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
