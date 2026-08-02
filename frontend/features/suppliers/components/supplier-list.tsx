'use client';

import Link from 'next/link';
import { MoreHorizontal, PencilLine, Plus, Power, PowerOff, Warehouse } from 'lucide-react';
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
import { useSetSupplierActive, useSuppliers } from '../hooks/use-suppliers';
import { SupplierStatusTabs } from './supplier-status-tabs';
import type { Supplier } from '../types/supplier.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;

const PAGE_SIZE = 25;

export function SupplierList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [confirming, setConfirming] = useState<Supplier | undefined>(undefined);
  const setActive = useSetSupplierActive();

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useSuppliers({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    isActive: values.status === 'all' ? undefined : values.status === 'active',
  });

  const columns: ListColumn<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      card: 'title',
      render: (supplier) => (
        <div className="min-w-0">
          <Link
            href={`/suppliers/${supplier.id}`}
            className="text-primary font-semibold hover:underline"
          >
            {supplier.name}
          </Link>
          <p className="text-muted-foreground text-xs">Added {formatDate(supplier.createdAt)}</p>
        </div>
      ),
      sortValue: (supplier) => supplier.name.toLowerCase(),
    },
    { key: 'phone', header: 'Phone', card: 'subtitle', render: (supplier) => supplier.phone },
    {
      key: 'email',
      header: 'Email',
      card: 'meta',
      render: (supplier) => supplier.email ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (supplier) => <StatusBadge isActive={supplier.isActive} />,
      sortValue: (supplier) => (supplier.isActive ? 1 : 0),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (supplier) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${supplier.name}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/suppliers/${supplier.id}/edit`} />}>
              <PencilLine className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant={supplier.isActive ? 'destructive' : 'default'}
              onClick={() => {
                setConfirming(supplier);
              }}
            >
              {supplier.isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {supplier.isActive ? 'Deactivate' : 'Activate'}
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
        searchPlaceholder="Search by name, phone or email"
        isFiltered={isFiltered}
        onReset={() => {
          setFilters({ search: '', status: 'all' });
        }}
        filters={
          <SupplierStatusTabs
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
          icon={Warehouse}
          title="The suppliers could not be loaded"
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
            records={query.data.suppliers}
            columns={columns}
            getRowKey={(supplier) => supplier.id}
            caption="Suppliers"
            emptyState={
              <EmptyState
                icon={Warehouse}
                title={isFiltered ? 'No suppliers match those filters' : 'No suppliers yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Register the suppliers Greenstone buys raw materials from.'
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
                    <Button render={<Link href="/suppliers/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add supplier
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
            ? 'It will no longer be selectable for new purchases. Existing records are kept, and you can activate it again at any time.'
            : 'It will become selectable again for new purchases.'
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
