'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { EmptyState } from '@/components/data-display/empty-state';
import { Pagination } from '@/components/data-display/pagination';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { useProductStock, useStockMovements } from '@/features/stock/hooks/use-stock';
import { formatDateTime } from '@/lib/format';

const MOVEMENT_LABELS: Record<string, string> = {
  OPENING: 'Opening',
  CURING_RELEASE: 'Curing release',
  GENERAL_STOCK_RELEASE: 'General stock release',
  DELIVERY_DISPATCH: 'Delivery dispatch',
  BROKEN: 'Broken',
  POSITIVE_ADJUSTMENT: 'Adjustment (+)',
  NEGATIVE_ADJUSTMENT: 'Adjustment (−)',
  CORRECTION: 'Correction',
};

const MOVEMENT_TONES: Record<string, StatusTone> = {
  OPENING: 'neutral',
  CURING_RELEASE: 'success',
  GENERAL_STOCK_RELEASE: 'success',
  DELIVERY_DISPATCH: 'info',
  BROKEN: 'danger',
  POSITIVE_ADJUSTMENT: 'warning',
  NEGATIVE_ADJUSTMENT: 'warning',
  CORRECTION: 'danger',
};

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const [page, setPage] = useState(1);

  const stockQuery = useProductStock(productId);
  const movementsQuery = useStockMovements(productId, page);

  if (stockQuery.isPending) {
    return (
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (stockQuery.isError) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon={Boxes}
          title="Stock could not be loaded"
          description="This product may not have a stock record yet."
          action={
            <Button variant="outline" render={<Link href="/stock" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to stock
            </Button>
          }
        />
      </div>
    );
  }

  const stock = stockQuery.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/stock" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to stock
      </Button>

      <PageHeader
        icon={Boxes}
        title="Finished stock"
        description={`Product ${productId}`}
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Physical quantity">
              {stock.physicalQuantity}
            </DetailRow>
            <DetailRow label="Reserved quantity">
              {stock.reservedQuantity}
            </DetailRow>
            <DetailRow label="Available quantity">
              <span className="font-semibold">{stock.availableQuantity}</span>
            </DetailRow>
            <DetailRow label="Last updated">
              {formatDateTime(stock.updatedAt)}
            </DetailRow>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 text-right font-medium">Qty</th>
                    <th className="p-4 text-right font-medium">Balance</th>
                    <th className="p-4 text-right font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsQuery.isPending ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  ) : movementsQuery.data && movementsQuery.data.movements.length > 0 ? (
                    movementsQuery.data.movements.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="p-4">
                          <StatusBadge
                            tone={MOVEMENT_TONES[m.movementType] ?? 'neutral'}
                            label={MOVEMENT_LABELS[m.movementType] ?? m.movementType}
                          />
                        </td>
                        <td
                          className={`p-4 text-right tabular-nums ${m.quantity < 0 ? 'text-destructive' : ''}`}
                        >
                          {m.quantity > 0 ? '+' : ''}
                          {m.quantity}
                        </td>
                        <td className="p-4 text-right tabular-nums">{m.balanceAfter}</td>
                        <td className="p-4 text-right">
                          {formatDateTime(m.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No movements recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {movementsQuery.data && (
          <Pagination
            page={movementsQuery.data.meta.page}
            pageSize={movementsQuery.data.meta.pageSize}
            totalRecords={movementsQuery.data.meta.totalRecords}
            totalPages={movementsQuery.data.meta.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
