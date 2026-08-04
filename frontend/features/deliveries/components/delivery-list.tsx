'use client';

import Link from 'next/link';
import { Truck, MoreHorizontal, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { TableToolbar } from '@/components/data-display/table-toolbar';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDate } from '@/lib/format';
import { useDeliveries } from '../hooks/use-deliveries';
import { DeliveryStatusBadge } from './delivery-status-badge';
import type { Delivery } from '../types/delivery.types';

const DEFAULTS = { page: '1', search: '' } as const;
const PAGE_SIZE = 25;

export function DeliveryList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const page = Number.parseInt(values.page, 10) || 1;

  const query = useDeliveries({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
  });

  const columns: ListColumn<Delivery>[] = [
    {
      key: 'deliveryNumber',
      header: 'Delivery',
      card: 'title',
      render: (delivery) => (
        <div className="min-w-0">
          <Link
            href={`/deliveries/${delivery.id}`}
            className="text-primary font-semibold hover:underline"
          >
            {delivery.deliveryNumber}
          </Link>
          <p className="text-muted-foreground text-xs">
            {delivery.customerName} — Added {formatDate(delivery.createdAt)}
          </p>
        </div>
      ),
      sortValue: (delivery) => delivery.deliveryNumber,
    },
    {
      key: 'orderNumber',
      header: 'Order',
      card: 'subtitle',
      render: (delivery) => delivery.orderNumber,
    },
    {
      key: 'driverName',
      header: 'Driver',
      card: 'meta',
      render: (delivery) => delivery.driverName,
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      card: 'meta',
      render: (delivery) => delivery.vehicleRegistrationNumber,
    },
    {
      key: 'deliveryDate',
      header: 'Date',
      card: 'meta',
      render: (delivery) => formatDate(delivery.deliveryDate),
      sortValue: (delivery) => delivery.deliveryDate,
    },
    {
      key: 'items',
      header: 'Items',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (delivery) => String(delivery.itemCount),
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (delivery) => <DeliveryStatusBadge status={delivery.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (delivery) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${delivery.deliveryNumber}`}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/deliveries/${delivery.id}`} />}>
              <FileText className="size-4" aria-hidden />
              View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isFiltered = values.search !== '';

  return (
    <div className="space-y-4">
      <TableToolbar
        search={values.search}
        onSearchChange={(search) => setFilters({ search })}
        searchPlaceholder="Search by number, customer, order or driver"
        isFiltered={isFiltered}
        onReset={() => setFilters({ search: '' })}
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={Truck}
          title="The deliveries could not be loaded"
          description="Check your connection and try again."
          action={
            <Button onClick={() => void query.refetch()}>Try again</Button>
          }
        />
      ) : (
        <>
          <ResponsiveList
            records={query.data.deliveries}
            columns={columns}
            getRowKey={(delivery) => delivery.id}
            caption="Deliveries"
            emptyState={
              <EmptyState
                icon={Truck}
                title={isFiltered ? 'No deliveries match that search' : 'No deliveries yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Plan a delivery to reserve stock for an order.'
                }
                action={
                  isFiltered ? (
                    <Button
                      variant="outline"
                      onClick={() => setFilters({ search: '' })}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button render={<Link href="/deliveries/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Plan delivery
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
