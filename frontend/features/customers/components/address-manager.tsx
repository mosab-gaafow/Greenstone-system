'use client';

import { useState } from 'react';
import { MapPin, MoreHorizontal, PencilLine, Plus, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { AddressDialog } from './address-dialog';
import { useSaveAddress, useSetAddressActive } from '../hooks/use-customers';
import type { CustomerAddress } from '../types/customer.types';

interface AddressManagerProps {
  customerId: string;
  addresses: CustomerAddress[];
  canEdit: boolean;
}

/**
 * Building-site addresses for one customer.
 *
 * Sites are deactivated rather than deleted, because orders and deliveries
 * reference them permanently.
 */
export function AddressManager({ customerId, addresses, canEdit }: AddressManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerAddress | undefined>(undefined);
  const [confirming, setConfirming] = useState<CustomerAddress | undefined>(undefined);

  const saveAddress = useSaveAddress(customerId);
  const setActive = useSetAddressActive(customerId);

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(address: CustomerAddress) {
    setEditing(address);
    setDialogOpen(true);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold">Building sites</h2>
          <p className="text-muted-foreground text-sm">
            Deliveries go to one site. A site can be used by many orders.
          </p>
        </div>
        {canEdit && addresses.length > 0 && (
          <Button variant="outline" className="h-11 shrink-0" onClick={openAdd}>
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">Add site</span>
          </Button>
        )}
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-lg border">
          <EmptyState
            icon={MapPin}
            title="No sites yet"
            description="Add the places this customer wants deliveries taken to."
            action={
              canEdit ? (
                <Button onClick={openAdd}>
                  <Plus className="size-4" aria-hidden />
                  Add site
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li key={address.id} className="bg-card rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{address.label}</p>
                  <p className="text-muted-foreground text-sm">{address.addressLine}</p>
                  {address.directions && (
                    <p className="text-muted-foreground text-sm italic">{address.directions}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge isActive={address.isActive} />

                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${address.label}`}
                          >
                            <MoreHorizontal className="size-4" aria-hidden />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            openEdit(address);
                          }}
                        >
                          <PencilLine className="size-4" aria-hidden />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant={address.isActive ? 'destructive' : 'default'}
                          onClick={() => {
                            setConfirming(address);
                          }}
                        >
                          {address.isActive ? (
                            <PowerOff className="size-4" aria-hidden />
                          ) : (
                            <Power className="size-4" aria-hidden />
                          )}
                          {address.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        address={editing}
        pending={saveAddress.isPending}
        onSubmit={async (values) => {
          await saveAddress.mutateAsync(editing ? { addressId: editing.id, values } : { values });
          setDialogOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirming !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(undefined);
          }
        }}
        title={
          confirming?.isActive
            ? `Deactivate ${confirming.label}?`
            : `Activate ${confirming?.label ?? ''}?`
        }
        description={
          confirming?.isActive
            ? 'It will no longer be selectable for new orders and deliveries. Existing records keep it.'
            : 'It will become selectable again for new orders and deliveries.'
        }
        confirmLabel={confirming?.isActive ? 'Deactivate' : 'Activate'}
        destructive={confirming?.isActive ?? false}
        pending={setActive.isPending}
        onConfirm={() => {
          if (confirming) {
            setActive.mutate(
              { addressId: confirming.id, isActive: !confirming.isActive },
              {
                onSettled: () => {
                  setConfirming(undefined);
                },
              },
            );
          }
        }}
      />
    </section>
  );
}
