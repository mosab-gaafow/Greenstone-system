'use client';

import Link from 'next/link';
import { Building2, MoreHorizontal, PencilLine, Plus, Power, PowerOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { TableToolbar } from '@/components/data-display/table-toolbar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDate } from '@/lib/format';
import { useSetVehicleOwnerActive, useVehicleOwners } from '../hooks/use-vehicle-owners';
import { VehicleOwnerStatusTabs } from './vehicle-owner-status-tabs';
import type { VehicleOwner } from '../types/vehicle-owner.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;

const PAGE_SIZE = 25;

export function VehicleOwnerList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [confirming, setConfirming] = useState<VehicleOwner | undefined>(undefined);
  const setActive = useSetVehicleOwnerActive();

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useVehicleOwners({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    isActive: values.status === 'all' ? undefined : values.status === 'active',
  });

  const columns: ListColumn<VehicleOwner>[] = [
    {
      key: 'name',
      header: 'Vehicle owner',
      card: 'title',
      render: (owner) => (
        <div className="min-w-0">
          <Link
            href={`/vehicle-owners/${owner.id}`}
            className="text-primary font-semibold hover:underline"
          >
            {owner.name}
          </Link>
          <p className="text-muted-foreground text-xs">Added {formatDate(owner.createdAt)}</p>
        </div>
      ),
      sortValue: (owner) => owner.name.toLowerCase(),
    },
    { key: 'phone', header: 'Phone', card: 'subtitle', render: (owner) => owner.phone },
    {
      key: 'nationalId',
      header: 'National ID',
      card: 'meta',
      render: (owner) => owner.nationalId ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (owner) => <StatusBadge isActive={owner.isActive} />,
      sortValue: (owner) => (owner.isActive ? 1 : 0),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (owner) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${owner.name}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/vehicle-owners/${owner.id}/edit`} />}>
              <PencilLine className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant={owner.isActive ? 'destructive' : 'default'}
              onClick={() => {
                setConfirming(owner);
              }}
            >
              {owner.isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {owner.isActive ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isFiltered = values.search !== '' || values.status !== 'all';

  return (
    <div className="space-y-4">
      <TableToolbar
        search={values.search}
        onSearchChange={(search) => {
          setFilters({ search });
        }}
        searchPlaceholder="Search by name or phone"
        isFiltered={isFiltered}
        onReset={() => {
          setFilters({ search: '', status: 'all' });
        }}
        filters={
          <VehicleOwnerStatusTabs
            value={values.status}
            onChange={(status) => {
              setFilters({ status });
            }}
          />
        }
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={Building2}
          title="The vehicle owners could not be loaded"
          description="Check your connection and try again."
          action={
            <Button
              onClick={() => {
                void query.refetch();
              }}
            >
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <ResponsiveList
            records={query.data.vehicleOwners}
            columns={columns}
            getRowKey={(owner) => owner.id}
            caption="Vehicle owners"
            emptyState={
              <EmptyState
                icon={Building2}
                title={isFiltered ? 'No vehicle owners match those filters' : 'No vehicle owners yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Register the vehicle owners Greenstone pays for transport.'
                }
                action={
                  isFiltered ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ search: '', status: 'all' });
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button render={<Link href="/vehicle-owners/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add vehicle owner
                    </Button>
                  )
                }
              />
            }
          />

          <Pagination
            page={query.data.meta.page}
            pageSize={query.data.meta.pageSize}
            totalRecords={query.data.meta.totalRecords}
            totalPages={query.data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={confirming !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(undefined);
          }
        }}
        title={
          confirming?.isActive
            ? `Deactivate ${confirming.name}?`
            : `Activate ${confirming?.name ?? ''}?`
        }
        description={
          confirming?.isActive
            ? 'They will no longer be selectable as an owner for new vehicles. Existing records are kept, and you can activate them again at any time.'
            : 'They will become selectable again for new vehicles.'
        }
        confirmLabel={confirming?.isActive ? 'Deactivate' : 'Activate'}
        destructive={confirming?.isActive ?? false}
        pending={setActive.isPending}
        onConfirm={() => {
          if (confirming) {
            setActive.mutate(
              { id: confirming.id, isActive: !confirming.isActive },
              {
                onSettled: () => {
                  setConfirming(undefined);
                },
              },
            );
          }
        }}
      />
    </div>
  );
}
