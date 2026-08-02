'use client';

import Link from 'next/link';
import { ShoppingCart, MoreHorizontal, FileText, Plus } from 'lucide-react';
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
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDate } from '@/lib/format';
import { useOrders } from '../hooks/use-orders';
import { OrderPaymentArrangementTabs } from './order-payment-arrangement-tabs';
import { orderPaymentArrangementLabel, orderStatusLabel, type Order } from '../types/order.types';

const DEFAULTS = { page: '1', search: '', paymentArrangement: 'all' } as const;

const PAGE_SIZE = 25;

const PAYMENT_ARRANGEMENT_TONE: Record<Order['paymentArrangement'], StatusTone> = {
  PREPAID: 'success',
  CREDIT: 'info',
};

const STATUS_TONE: Record<Order['status'], StatusTone> = {
  PENDING: 'neutral',
  IN_PRODUCTION: 'info',
  CURING: 'info',
  READY_FOR_DELIVERY: 'warning',
  PARTIALLY_DELIVERED: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export function OrderList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useOrders({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    paymentArrangement:
      values.paymentArrangement === 'all'
        ? undefined
        : (values.paymentArrangement as Order['paymentArrangement']),
  });

  const columns: ListColumn<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      card: 'title',
      render: (order) => (
        <div className="min-w-0">
          <Link href={`/orders/${order.id}`} className="text-primary font-semibold hover:underline">
            {order.orderNumber}
          </Link>
          <p className="text-muted-foreground text-xs">Added {formatDate(order.createdAt)}</p>
        </div>
      ),
      sortValue: (order) => order.orderNumber,
    },
    {
      key: 'customerName',
      header: 'Customer',
      card: 'subtitle',
      render: (order) => order.customerName,
    },
    {
      key: 'itemCount',
      header: 'Items',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (order) => String(order.itemCount),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (order) => `KES ${order.totalAmount}`,
      sortValue: (order) => Number(order.totalAmount),
    },
    {
      key: 'paymentArrangement',
      header: 'Payment',
      card: 'badge',
      render: (order) => (
        <StatusBadge
          tone={PAYMENT_ARRANGEMENT_TONE[order.paymentArrangement]}
          label={orderPaymentArrangementLabel(order.paymentArrangement)}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (order) => (
        <StatusBadge tone={STATUS_TONE[order.status]} label={orderStatusLabel(order.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (order) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${order.orderNumber}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/orders/${order.id}`} />}>
              <FileText className="size-4" aria-hidden />
              View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isFiltered = values.search !== '' || values.paymentArrangement !== 'all';

  return (
    <div className="space-y-4">
      <TableToolbar
        search={values.search}
        onSearchChange={(search) => {
          setFilters({ search });
        }}
        searchPlaceholder="Search by number or customer"
        isFiltered={isFiltered}
        onReset={() => {
          setFilters({ search: '', paymentArrangement: 'all' });
        }}
        filters={
          <OrderPaymentArrangementTabs
            value={values.paymentArrangement}
            onChange={(paymentArrangement) => {
              setFilters({ paymentArrangement });
            }}
          />
        }
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={ShoppingCart}
          title="The orders could not be loaded"
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
            records={query.data.orders}
            columns={columns}
            getRowKey={(order) => order.id}
            caption="Orders"
            emptyState={
              <EmptyState
                icon={ShoppingCart}
                title={isFiltered ? 'No orders match those filters' : 'No orders yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Create a direct order for a customer.'
                }
                action={
                  isFiltered ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ search: '', paymentArrangement: 'all' });
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button render={<Link href="/orders/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add order
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
