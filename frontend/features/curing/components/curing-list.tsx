'use client';

import Link from 'next/link';
import { Layers, MoreHorizontal, FileText } from 'lucide-react';
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
import { StatusTabs } from '@/components/shared/status-tabs';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDateTime } from '@/lib/format';
import { useCuringRecords } from '../hooks/use-curing';
import { curingDurationLabel } from '@/features/production/types/production.types';
import { type CuringRecord } from '../types/curing.types';
import { Countdown } from './countdown';

const DEFAULTS = { page: '1', status: 'PENDING' };

const PAGE_SIZE = 25;

export function CuringList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useCuringRecords({
    page,
    pageSize: PAGE_SIZE,
    status: values.status === 'all' ? undefined : (values.status as 'PENDING' | 'RELEASED'),
  });

  const columns: ListColumn<CuringRecord>[] = [
    {
      key: 'productName',
      header: 'Product',
      card: 'title',
      render: (record) => (
        <div className="min-w-0">
          <Link href={`/curing/${record.id}`} className="text-primary font-semibold hover:underline">
            {record.productName}
          </Link>
          <p className="text-muted-foreground text-xs">{record.productionNumber}</p>
        </div>
      ),
      sortValue: (record) => record.productName.toLowerCase(),
    },
    {
      key: 'quantityEntering',
      header: 'Qty',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (record) => String(record.quantityEntering),
    },
    {
      key: 'currentDuration',
      header: 'Duration',
      card: 'subtitle',
      render: (record) => curingDurationLabel(record.currentDuration),
    },
    {
      key: 'plannedCompletion',
      header: 'Planned completion',
      card: 'meta',
      render: (record) => formatDateTime(record.plannedCompletion),
    },
    {
      key: 'countdown',
      header: 'Remaining',
      card: 'meta',
      render: (record) =>
        record.status === 'IN_PROGRESS' ? (
          <Countdown plannedCompletion={record.plannedCompletion} />
        ) : record.status === 'READY_FOR_RELEASE' ? (
          <span className="text-warning font-semibold">Ready for release</span>
        ) : null,
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (record) => {
        const tone: StatusTone =
          record.status === 'RELEASED'
            ? 'success'
            : record.status === 'READY_FOR_RELEASE'
              ? 'warning'
              : 'neutral';
        const label =
          record.status === 'RELEASED'
            ? 'Released'
            : record.status === 'READY_FOR_RELEASE'
              ? 'Ready'
              : 'Curing';
        return <StatusBadge tone={tone} label={label} />;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (record) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${record.productName}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/curing/${record.id}`} />}>
              <FileText className="size-4" aria-hidden />
              View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <StatusTabs
        value={values.status}
        onChange={(status) => {
          setFilters({ status });
        }}
        options={[
          { value: 'PENDING', label: 'Curing' },
          { value: 'RELEASED', label: 'Released' },
          { value: 'all', label: 'All' },
        ]}
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={Layers}
          title="Curing records could not be loaded"
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
            records={query.data.records}
            columns={columns}
            getRowKey={(record) => record.id}
            caption="Curing"
            emptyState={
              <EmptyState
                icon={Layers}
                title="No curing records"
                description="Curing records are created automatically when production is recorded."
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
