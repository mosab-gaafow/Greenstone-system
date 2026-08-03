'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Wallet, MoreHorizontal, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { TableToolbar } from '@/components/data-display/table-toolbar';
import { StatusTabs } from '@/components/shared/status-tabs';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDate } from '@/lib/format';
import { usePurchasePayments } from '../hooks/use-purchase-payments';
import {
  paymentMethodLabel,
  purchasePaymentStatusLabel,
  type PurchasePayment,
  type PurchasePaymentStatus,
} from '../types/purchase-payment.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;

const PAGE_SIZE = 25;

const STATUS_TONE: Record<PurchasePaymentStatus, StatusTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REVERSED: 'neutral',
};

export function PurchasePaymentList({ supplierId }: { supplierId?: string } = {}) {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const searchParams = useSearchParams();
  // Supports deep-linking from a supplier's own page (`?supplierId=`),
  // alongside the explicit prop used when embedding this list elsewhere.
  const effectiveSupplierId = supplierId ?? searchParams.get('supplierId') ?? undefined;

  const page = Number.parseInt(values.page, 10) || 1;

  const query = usePurchasePayments({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    status: values.status === 'all' ? undefined : (values.status as PurchasePaymentStatus),
    supplierId: effectiveSupplierId,
  });

  const columns: ListColumn<PurchasePayment>[] = [
    {
      key: 'paymentNumber',
      header: 'Payment',
      card: 'title',
      render: (payment) => (
        <div className="min-w-0">
          <Link
            href={`/purchase-payments/${payment.id}`}
            className="text-primary font-semibold hover:underline"
          >
            {payment.paymentNumber}
          </Link>
          <p className="text-muted-foreground text-xs">{formatDate(payment.paymentDate)}</p>
        </div>
      ),
      sortValue: (payment) => payment.paymentNumber,
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      card: 'subtitle',
      render: (payment) => payment.supplierName,
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      card: 'meta',
      render: (payment) => paymentMethodLabel(payment.paymentMethod),
    },
    {
      key: 'amount',
      header: 'Amount',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (payment) => `KES ${payment.amount}`,
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (payment) => (
        <StatusBadge tone={STATUS_TONE[payment.status]} label={purchasePaymentStatusLabel(payment.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (payment) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${payment.paymentNumber}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/purchase-payments/${payment.id}`} />}>
              <FileText className="size-4" aria-hidden />
              View
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
        searchPlaceholder="Search by payment number"
        isFiltered={isFiltered}
        onReset={() => {
          setFilters({ search: '', status: 'all' });
        }}
        filters={
          <StatusTabs
            value={values.status}
            onChange={(status) => {
              setFilters({ status });
            }}
            options={[
              { value: 'all', label: 'All' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REVERSED', label: 'Reversed' },
            ]}
          />
        }
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={Wallet}
          title="The purchase payments could not be loaded"
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
            records={query.data.payments}
            columns={columns}
            getRowKey={(payment) => payment.id}
            caption="Purchase payments"
            emptyState={
              <EmptyState
                icon={Wallet}
                title={isFiltered ? 'No payments match those filters' : 'No purchase payments yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Record a payment made to a supplier.'
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
                    <Button render={<Link href="/purchase-payments/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add payment
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
    </div>
  );
}
