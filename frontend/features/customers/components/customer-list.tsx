'use client';

import Link from 'next/link';
import { MoreHorizontal, PencilLine, Plus, Power, PowerOff, Users } from 'lucide-react';
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
import { useCustomers, useSetCustomerActive } from '../hooks/use-customers';
import { CustomerStatusTabs } from './customer-status-tabs';
import type { Customer } from '../types/customer.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;

const PAGE_SIZE = 25;

export function CustomerList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [confirming, setConfirming] = useState<Customer | undefined>(undefined);
  const setActive = useSetCustomerActive();

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useCustomers({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    isActive: values.status === 'all' ? undefined : values.status === 'active',
  });

  const columns: ListColumn<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      card: 'title',
      render: (customer) => (
        <div className="min-w-0">
          <Link
            href={`/customers/${customer.id}`}
            className="text-primary font-semibold hover:underline"
          >
            {customer.name}
          </Link>
          <p className="text-muted-foreground text-xs">Added {formatDate(customer.createdAt)}</p>
        </div>
      ),
      sortValue: (customer) => customer.name.toLowerCase(),
    },
    { key: 'phone', header: 'Phone', card: 'subtitle', render: (customer) => customer.phone },
    {
      key: 'email',
      header: 'Email',
      card: 'meta',
      render: (customer) => customer.email ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'sites',
      header: 'Sites',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (customer) => String(customer.addressCount),
      sortValue: (customer) => customer.addressCount,
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (customer) => <StatusBadge isActive={customer.isActive} />,
      sortValue: (customer) => (customer.isActive ? 1 : 0),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${customer.name}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/customers/${customer.id}/edit`} />}>
              <PencilLine className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant={customer.isActive ? 'destructive' : 'default'}
              onClick={() => {
                setConfirming(customer);
              }}
            >
              {customer.isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {customer.isActive ? 'Deactivate' : 'Activate'}
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
          <CustomerStatusTabs
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
          icon={Users}
          title="The customers could not be loaded"
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
            records={query.data.customers}
            columns={columns}
            getRowKey={(customer) => customer.id}
            caption="Customers"
            emptyState={
              <EmptyState
                icon={Users}
                title={isFiltered ? 'No customers match those filters' : 'No customers yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Add the contractors, developers and homeowners Greenstone supplies.'
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
                    <Button render={<Link href="/customers/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add customer
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
            ? 'No new orders can be created for them. Existing records are kept, and you can activate them again at any time.'
            : 'New orders can be created for them again.'
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
