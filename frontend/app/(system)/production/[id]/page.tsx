'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { useProductionBatch } from '@/features/production/hooks/use-production';
import {
  productionPurposeLabel,
  productionStatusLabel,
  type ProductionStatus,
} from '@/features/production/types/production.types';
import { formatDate } from '@/lib/format';

const STATUS_TONE: Record<ProductionStatus, StatusTone> = {
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
};

export default function ProductionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useProductionBatch(id);

  if (query.isPending) {
    return (
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon={Factory}
          title="This production run could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/production" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to production
            </Button>
          }
        />
      </div>
    );
  }

  const batch = query.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/production" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to production
      </Button>

      <PageHeader
        icon={Factory}
        title={batch.productionNumber}
        badge={<StatusBadge tone={STATUS_TONE[batch.status]} label={productionStatusLabel(batch.status)} />}
        description={batch.orderNumber ? `For order ${batch.orderNumber}` : productionPurposeLabel(batch.purpose)}
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Production date">{formatDate(batch.productionDate)}</DetailRow>
            <DetailRow label="Purpose">{productionPurposeLabel(batch.purpose)}</DetailRow>
            {batch.orderNumber && (
              <DetailRow label="Order">
                <Link href={`/orders/${batch.orderId}`} className="text-primary hover:underline">
                  {batch.orderNumber}
                </Link>
              </DetailRow>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-medium">Product</th>
                    <th className="p-4 text-right font-medium">Pallets</th>
                    <th className="p-4 text-right font-medium">Produced</th>
                    <th className="p-4 text-right font-medium">Broken</th>
                    <th className="p-4 text-right font-medium">Usable</th>
                    <th className="p-4 text-right font-medium">Allocated</th>
                    <th className="p-4 text-right font-medium">Excess</th>
                    <th className="p-4 font-medium">Curing</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-4">{item.productName}</td>
                      <td className="p-4 text-right tabular-nums">{item.pallets}</td>
                      <td className="p-4 text-right tabular-nums">{item.producedQuantity}</td>
                      <td className="p-4 text-right tabular-nums">{item.brokenQuantity}</td>
                      <td className="p-4 text-right tabular-nums">{item.usableQuantity}</td>
                      <td className="p-4 text-right tabular-nums">{item.allocatedQuantity}</td>
                      <td className="p-4 text-right tabular-nums">{item.excessQuantity}</td>
                      <td className="p-4">
                        {item.curingRecordId ? (
                          <Link href={`/curing/${item.curingRecordId}`} className="text-primary hover:underline">
                            View curing
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {batch.rawMaterialUsages.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-4 font-medium">Raw material</th>
                      <th className="p-4 text-right font-medium">Quantity used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.rawMaterialUsages.map((usage) => (
                      <tr key={usage.id} className="border-b last:border-0">
                        <td className="p-4">{usage.rawMaterialName}</td>
                        <td className="p-4 text-right tabular-nums">
                          {usage.quantity} {usage.measurementUnitSymbol ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
