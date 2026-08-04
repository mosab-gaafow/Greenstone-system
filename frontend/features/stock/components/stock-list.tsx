'use client';

import Link from 'next/link';
import { Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { useStockList } from '../hooks/use-stock';
import type { StockRow } from '../stock.types';

export function StockList() {
  const query = useStockList();

  const columns: ListColumn<StockRow>[] = [
    {
      key: 'productName',
      header: 'Product',
      card: 'title',
      render: (row) => (
        <Link
          href={`/stock/${row.productId}`}
          className="text-primary font-semibold hover:underline"
        >
          {row.productName}
        </Link>
      ),
    },
    {
      key: 'physicalQuantity',
      header: 'Physical',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (row) => String(row.physicalQuantity),
    },
    {
      key: 'reservedQuantity',
      header: 'Reserved',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (row) => String(row.reservedQuantity),
    },
    {
      key: 'availableQuantity',
      header: 'Available',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums font-semibold',
      render: (row) => String(row.availableQuantity),
    },
  ];

  if (query.isPending) return <ListSkeleton />;

  if (query.isError) {
    return (
      <EmptyState
        icon={Boxes}
        title="Stock could not be loaded"
        description="Check your connection and try again."
        action={
          <Button onClick={() => void query.refetch()}>Try again</Button>
        }
      />
    );
  }

  return (
    <ResponsiveList
      records={query.data}
      columns={columns}
      getRowKey={(row) => row.productId}
      caption="Finished stock"
      emptyState={
        <EmptyState
          icon={Boxes}
          title="No finished stock"
          description="Stock balances appear when products are produced or opening stock is set."
        />
      }
    />
  );
}
