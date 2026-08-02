'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, PencilLine, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useSetProductActive } from '../hooks/use-products';
import type { Product } from '../types/product.types';

/**
 * Row and card actions for a product.
 *
 * Edit is the common action, so it is reachable in one tap. Deactivating is
 * less common and harder to undo, so it sits in the menu and asks first.
 */
export function ProductActions({ product }: { product: Product }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const setActive = useSetProductActive();

  const deactivating = product.isActive;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label={`Actions for ${product.name}`}>
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/products/${product.id}/edit`} />}>
            <PencilLine className="size-4" aria-hidden />
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem
            variant={deactivating ? 'destructive' : 'default'}
            onClick={() => {
              setConfirmOpen(true);
            }}
          >
            {deactivating ? (
              <PowerOff className="size-4" aria-hidden />
            ) : (
              <Power className="size-4" aria-hidden />
            )}
            {deactivating ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={deactivating ? `Deactivate ${product.name}?` : `Activate ${product.name}?`}
        description={
          deactivating
            ? 'It will no longer be available on new orders. Existing records keep it, and you can activate it again at any time.'
            : 'It will become available again on new orders.'
        }
        confirmLabel={deactivating ? 'Deactivate' : 'Activate'}
        destructive={deactivating}
        pending={setActive.isPending}
        onConfirm={() => {
          setActive.mutate(
            { id: product.id, isActive: !product.isActive },
            {
              onSettled: () => {
                setConfirmOpen(false);
              },
            },
          );
        }}
      />
    </>
  );
}
