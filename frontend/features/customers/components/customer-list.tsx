'use client';

import Link from 'next/link';
import {
  MoreHorizontal,
  PencilLine,
  Plus,
  Power,
  PowerOff,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { FilterSelect } from '@/components/shared/filter-select';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDate } from '@/lib/format';
import { ApiError } from '@/lib/api-client';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canForceDeactivateCustomer } from '@/lib/permissions';
import {
  useCustomers,
  useForceDeactivateCustomer,
  useSetCustomerActive,
} from '../hooks/use-customers';
import { CustomerStatusTabs } from './customer-status-tabs';
import type { Customer } from '../types/customer.types';

const DEFAULTS = { page: '1', search: '', status: 'all', balance: 'all' } as const;

const PAGE_SIZE = 25;

/**
 * Independent of active status and credit status (business-blueprint
 * section 2.2) — the accounting outstanding balance only, never the
 * projected credit exposure.
 */
const BALANCE_FILTER = [
  { value: 'all', label: 'All balances' },
  { value: 'no', label: 'No outstanding balance' },
  { value: 'has', label: 'Has outstanding balance' },
];

export function CustomerList() {
  const { user } = useCurrentUser();
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [confirming, setConfirming] = useState<Customer | undefined>(undefined);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const setActive = useSetCustomerActive();

  const [forceDeactivating, setForceDeactivating] = useState<Customer | undefined>(undefined);
  const [forceReason, setForceReason] = useState('');
  const [forceReasonError, setForceReasonError] = useState<string | null>(null);
  const forceDeactivate = useForceDeactivateCustomer();

  function closeForceDialog() {
    setForceDeactivating(undefined);
    setForceReason('');
    setForceReasonError(null);
  }

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useCustomers({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    isActive: values.status === 'all' ? undefined : values.status === 'active',
    hasOutstandingBalance: values.balance === 'all' ? undefined : values.balance === 'has',
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
            {customer.isActive && canForceDeactivateCustomer(user) && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  setForceDeactivating(customer);
                }}
              >
                <ShieldAlert className="size-4" aria-hidden />
                Force deactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isFiltered =
    values.search !== '' || values.status !== 'all' || values.balance !== 'all';

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
          setFilters({ search: '', status: 'all', balance: 'all' });
        }}
        filters={
          <div className="flex gap-3">
            <CustomerStatusTabs
              value={values.status}
              onChange={(status) => {
                setFilters({ status });
              }}
            />
            <FilterSelect
              label="Balance"
              value={values.balance}
              options={BALANCE_FILTER}
              onChange={(balance) => {
                setFilters({ balance });
              }}
            />
          </div>
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
                        setFilters({ search: '', status: 'all', balance: 'all' });
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
            setDeactivateError(null);
          }
        }}
        title={
          confirming?.isActive
            ? `Deactivate ${confirming.name}?`
            : `Activate ${confirming?.name ?? ''}?`
        }
        description={
          confirming?.isActive
            ? 'Only allowed once every order is completed or cancelled and the outstanding balance is zero. Existing records are kept either way.'
            : 'New orders can be created for them again.'
        }
        confirmLabel={confirming?.isActive ? 'Deactivate' : 'Activate'}
        destructive={confirming?.isActive ?? false}
        pending={setActive.isPending}
        onConfirm={() => {
          if (confirming) {
            setDeactivateError(null);
            setActive.mutate(
              { id: confirming.id, isActive: !confirming.isActive },
              {
                onSuccess: () => {
                  setConfirming(undefined);
                },
                onError: (error) => {
                  setDeactivateError(
                    error instanceof ApiError
                      ? error.message
                      : 'The customer status could not be changed.',
                  );
                },
              },
            );
          }
        }}
      >
        {deactivateError && (
          <p className="text-destructive text-sm" role="alert">
            {deactivateError}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={forceDeactivating !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            closeForceDialog();
          }
        }}
        title={`Force-deactivate ${forceDeactivating?.name ?? ''}?`}
        description="Bypasses the normal safeguards — active orders, reservations, and the outstanding balance are left exactly as they are. Only for an exceptional business reason."
        confirmLabel="Force deactivate"
        destructive
        pending={forceDeactivate.isPending}
        onConfirm={() => {
          const trimmed = forceReason.trim();

          if (!trimmed) {
            setForceReasonError('A reason is required to force-deactivate a customer.');
            return;
          }

          if (forceDeactivating) {
            forceDeactivate.mutate(
              { id: forceDeactivating.id, reason: trimmed },
              { onSuccess: closeForceDialog },
            );
          }
        }}
      >
        <Textarea
          placeholder="Reason (required)"
          value={forceReason}
          onChange={(event) => {
            setForceReason(event.target.value);
            if (forceReasonError) setForceReasonError(null);
          }}
        />
        {forceReasonError && (
          <p className="text-destructive text-sm" role="alert">
            {forceReasonError}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
