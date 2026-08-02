'use client';

import Link from 'next/link';
import { Factory, MoreHorizontal, FileText, Plus } from 'lucide-react';
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
import { useProductionBatches } from '../hooks/use-production';
import { productionPurposeLabel, productionStatusLabel, type Production } from '../types/production.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;

const PAGE_SIZE = 25;

const STATUS_TONE: Record<Production['status'], StatusTone> = {
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
};

export function ProductionList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useProductionBatches({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    status: values.status === 'all' ? undefined : (values.status as Production['status']),
  });

  const columns: ListColumn<Production>[] = [
    {
      key: 'productionNumber',
      header: 'Production',
      card: 'title',
      render: (batch) => (
        <div className="min-w-0">
          <Link href={`/production/${batch.id}`} className="text-primary font-semibold hover:underline">
            {batch.productionNumber}
          </Link>
          <p className="text-muted-foreground text-xs">Added {formatDate(batch.createdAt)}</p>
        </div>
      ),
      sortValue: (batch) => batch.productionNumber,
    },
    {
      key: 'purpose',
      header: 'Purpose',
      card: 'subtitle',
      render: (batch) => (batch.orderNumber ? `${batch.orderNumber}` : productionPurposeLabel(batch.purpose)),
    },
    {
      key: 'itemCount',
      header: 'Items',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (batch) => String(batch.itemCount),
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (batch) => (
        <StatusBadge tone={STATUS_TONE[batch.status]} label={productionStatusLabel(batch.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (batch) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${batch.productionNumber}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/production/${batch.id}`} />}>
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
        searchPlaceholder="Search by production number"
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
              { value: 'IN_PROGRESS', label: 'In progress' },
              { value: 'COMPLETED', label: 'Completed' },
            ]}
          />
        }
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={Factory}
          title="The production runs could not be loaded"
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
            records={query.data.batches}
            columns={columns}
            getRowKey={(batch) => batch.id}
            caption="Production runs"
            emptyState={
              <EmptyState
                icon={Factory}
                title={isFiltered ? 'No production runs match those filters' : 'No production yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Record a production run for an order or general stock.'
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
                    <Button render={<Link href="/production/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add production
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
