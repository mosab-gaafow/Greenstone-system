'use client';

import Link from 'next/link';
import { FileText, MoreHorizontal, PencilLine, Plus } from 'lucide-react';
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
import { useQuotations } from '../hooks/use-quotations';
import { QuotationStatusTabs } from './quotation-status-tabs';
import { quotationStatusLabel, type Quotation } from '../types/quotation.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;

const PAGE_SIZE = 25;

const STATUS_TONE: Record<Quotation['status'], StatusTone> = {
  DRAFT: 'neutral',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

export function QuotationList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useQuotations({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    status: values.status === 'all' ? undefined : (values.status as Quotation['status']),
  });

  const columns: ListColumn<Quotation>[] = [
    {
      key: 'quotationNumber',
      header: 'Quotation',
      card: 'title',
      render: (quotation) => (
        <div className="min-w-0">
          <Link
            href={`/quotations/${quotation.id}`}
            className="text-primary font-semibold hover:underline"
          >
            {quotation.quotationNumber}
          </Link>
          <p className="text-muted-foreground text-xs">Added {formatDate(quotation.createdAt)}</p>
        </div>
      ),
      sortValue: (quotation) => quotation.quotationNumber,
    },
    {
      key: 'customerName',
      header: 'Customer',
      card: 'subtitle',
      render: (quotation) => quotation.customerName,
    },
    {
      key: 'itemCount',
      header: 'Items',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (quotation) => String(quotation.itemCount),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (quotation) => `KES ${quotation.totalAmount}`,
      sortValue: (quotation) => Number(quotation.totalAmount),
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (quotation) => (
        <StatusBadge
          tone={STATUS_TONE[quotation.status]}
          label={quotationStatusLabel(quotation.status)}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (quotation) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${quotation.quotationNumber}`}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/quotations/${quotation.id}`} />}>
              <FileText className="size-4" aria-hidden />
              View
            </DropdownMenuItem>
            {quotation.status === 'DRAFT' && (
              <DropdownMenuItem render={<Link href={`/quotations/${quotation.id}/edit`} />}>
                <PencilLine className="size-4" aria-hidden />
                Edit
              </DropdownMenuItem>
            )}
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
        searchPlaceholder="Search by number or customer"
        isFiltered={isFiltered}
        onReset={() => {
          setFilters({ search: '', status: 'all' });
        }}
        filters={
          <QuotationStatusTabs
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
          icon={FileText}
          title="The quotations could not be loaded"
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
            records={query.data.quotations}
            columns={columns}
            getRowKey={(quotation) => quotation.id}
            caption="Quotations"
            emptyState={
              <EmptyState
                icon={FileText}
                title={isFiltered ? 'No quotations match those filters' : 'No quotations yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Create a quotation for a customer to get started.'
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
                    <Button render={<Link href="/quotations/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add quotation
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
