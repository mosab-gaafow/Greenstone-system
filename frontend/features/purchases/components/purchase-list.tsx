'use client';

import Link from 'next/link';
import { ClipboardList, MoreHorizontal, FileText, Plus } from 'lucide-react';
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
import { usePurchases } from '../hooks/use-purchases';
import type { Purchase } from '../types/purchase.types';

const DEFAULTS = { page: '1', search: '' } as const;

const PAGE_SIZE = 25;

export function PurchaseList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);

  const page = Number.parseInt(values.page, 10) || 1;

  const query = usePurchases({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
  });

  const columns: ListColumn<Purchase>[] = [
    {
      key: 'purchaseNumber',
      header: 'Purchase',
      card: 'title',
      render: (purchase) => (
        <div className="min-w-0">
          <Link href={`/purchases/${purchase.id}`} className="text-primary font-semibold hover:underline">
            {purchase.purchaseNumber}
          </Link>
          <p className="text-muted-foreground text-xs">{formatDate(purchase.purchaseDate)}</p>
        </div>
      ),
      sortValue: (purchase) => purchase.purchaseNumber,
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      card: 'subtitle',
      render: (purchase) => purchase.supplierName,
    },
    {
      key: 'itemCount',
      header: 'Items',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (purchase) => String(purchase.itemCount),
    },
    {
      key: 'totalCost',
      header: 'Total cost',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (purchase) => `KES ${purchase.totalCost}`,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (purchase) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${purchase.purchaseNumber}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/purchases/${purchase.id}`} />}>
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
        onSearchChange={(search) => {
          setFilters({ search });
        }}
        searchPlaceholder="Search by purchase number"
        isFiltered={isFiltered}
        onReset={() => {
          setFilters({ search: '' });
        }}
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={ClipboardList}
          title="The purchases could not be loaded"
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
            records={query.data.purchases}
            columns={columns}
            getRowKey={(purchase) => purchase.id}
            caption="Purchases"
            emptyState={
              <EmptyState
                icon={ClipboardList}
                title={isFiltered ? 'No purchases match those filters' : 'No purchases yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Record a purchase from a supplier.'
                }
                action={
                  isFiltered ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ search: '' });
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button render={<Link href="/purchases/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add purchase
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
