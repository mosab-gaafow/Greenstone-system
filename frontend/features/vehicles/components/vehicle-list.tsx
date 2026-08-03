'use client';

import Link from 'next/link';
import { MoreHorizontal, PencilLine, Plus, Power, PowerOff, Truck } from 'lucide-react';
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
import { useSetVehicleActive, useVehicles } from '../hooks/use-vehicles';
import { VehicleStatusTabs } from './vehicle-status-tabs';
import type { Vehicle } from '../types/vehicle.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;

const PAGE_SIZE = 25;

export function VehicleList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [confirming, setConfirming] = useState<Vehicle | undefined>(undefined);
  const setActive = useSetVehicleActive();

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useVehicles({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    isActive: values.status === 'all' ? undefined : values.status === 'active',
  });

  const columns: ListColumn<Vehicle>[] = [
    {
      key: 'registrationNumber',
      header: 'Vehicle',
      card: 'title',
      render: (vehicle) => (
        <div className="min-w-0">
          <Link
            href={`/vehicles/${vehicle.id}`}
            className="text-primary font-semibold hover:underline"
          >
            {vehicle.registrationNumber}
          </Link>
          <p className="text-muted-foreground text-xs">Added {formatDate(vehicle.createdAt)}</p>
        </div>
      ),
      sortValue: (vehicle) => vehicle.registrationNumber.toLowerCase(),
    },
    { key: 'vehicleType', header: 'Type', card: 'subtitle', render: (vehicle) => vehicle.vehicleType },
    {
      key: 'owner',
      header: 'Owner',
      card: 'meta',
      render: (vehicle) => vehicle.vehicleOwnerName,
      sortValue: (vehicle) => vehicle.vehicleOwnerName.toLowerCase(),
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (vehicle) => <StatusBadge isActive={vehicle.isActive} />,
      sortValue: (vehicle) => (vehicle.isActive ? 1 : 0),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (vehicle) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${vehicle.registrationNumber}`}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/vehicles/${vehicle.id}/edit`} />}>
              <PencilLine className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant={vehicle.isActive ? 'destructive' : 'default'}
              onClick={() => {
                setConfirming(vehicle);
              }}
            >
              {vehicle.isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {vehicle.isActive ? 'Deactivate' : 'Activate'}
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
        searchPlaceholder="Search by registration or type"
        isFiltered={isFiltered}
        onReset={() => {
          setFilters({ search: '', status: 'all' });
        }}
        filters={
          <VehicleStatusTabs
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
          icon={Truck}
          title="The vehicles could not be loaded"
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
            records={query.data.vehicles}
            columns={columns}
            getRowKey={(vehicle) => vehicle.id}
            caption="Vehicles"
            emptyState={
              <EmptyState
                icon={Truck}
                title={isFiltered ? 'No vehicles match those filters' : 'No vehicles yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Register the hired vehicles Greenstone uses for deliveries.'
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
                    <Button render={<Link href="/vehicles/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add vehicle
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
            ? `Deactivate ${confirming.registrationNumber}?`
            : `Activate ${confirming?.registrationNumber ?? ''}?`
        }
        description={
          confirming?.isActive
            ? 'It will no longer be selectable for new deliveries. Existing records are kept, and you can activate it again at any time.'
            : 'It will become selectable again for new deliveries.'
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
