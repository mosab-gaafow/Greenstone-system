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
import { useDrivers, useSetDriverActive } from '../hooks/use-drivers';
import { DriverStatusTabs } from './driver-status-tabs';
import type { Driver } from '../types/driver.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;

const PAGE_SIZE = 25;

export function DriverList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [confirming, setConfirming] = useState<Driver | undefined>(undefined);
  const setActive = useSetDriverActive();

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useDrivers({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    isActive: values.status === 'all' ? undefined : values.status === 'active',
  });

  const columns: ListColumn<Driver>[] = [
    {
      key: 'name',
      header: 'Driver',
      card: 'title',
      render: (driver) => (
        <div className="min-w-0">
          <Link href={`/drivers/${driver.id}`} className="text-primary font-semibold hover:underline">
            {driver.name}
          </Link>
          <p className="text-muted-foreground text-xs">Added {formatDate(driver.createdAt)}</p>
        </div>
      ),
      sortValue: (driver) => driver.name.toLowerCase(),
    },
    { key: 'phone', header: 'Phone', card: 'subtitle', render: (driver) => driver.phone },
    {
      key: 'nationalId',
      header: 'National ID',
      card: 'meta',
      render: (driver) => driver.nationalId,
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (driver) => <StatusBadge isActive={driver.isActive} />,
      sortValue: (driver) => (driver.isActive ? 1 : 0),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (driver) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${driver.name}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/drivers/${driver.id}/edit`} />}>
              <PencilLine className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant={driver.isActive ? 'destructive' : 'default'}
              onClick={() => {
                setConfirming(driver);
              }}
            >
              {driver.isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {driver.isActive ? 'Deactivate' : 'Activate'}
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
          <DriverStatusTabs
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
          title="The drivers could not be loaded"
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
            records={query.data.drivers}
            columns={columns}
            getRowKey={(driver) => driver.id}
            caption="Drivers"
            emptyState={
              <EmptyState
                icon={Truck}
                title={isFiltered ? 'No drivers match those filters' : 'No drivers yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Register the drivers Greenstone employs.'
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
                    <Button render={<Link href="/drivers/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add driver
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
            ? 'They will no longer be selectable for new deliveries. Existing records are kept, and you can activate them again at any time.'
            : 'They will become selectable again for new deliveries.'
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
