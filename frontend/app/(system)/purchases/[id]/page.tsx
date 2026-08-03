'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { EmptyState } from '@/components/data-display/empty-state';
import { usePurchase } from '@/features/purchases/hooks/use-purchases';
import { isPumiceMaterial } from '@/features/purchases/types/purchase.types';
import { PurchasePaymentHistory } from '@/features/purchase-payments/components/purchase-payment-history';
import { formatDate } from '@/lib/format';

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = usePurchase(id);

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
          icon={ClipboardList}
          title="This purchase could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/purchases" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to purchases
            </Button>
          }
        />
      </div>
    );
  }

  const purchase = query.data;
  const hasPumiceItem = purchase.items.some((item) => isPumiceMaterial(item.rawMaterialName));

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/purchases" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to purchases
      </Button>

      <PageHeader
        icon={ClipboardList}
        title={purchase.purchaseNumber}
        description={purchase.supplierName}
      />

      <div className="max-w-4xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Supplier">
              <Link href={`/suppliers/${purchase.supplierId}`} className="text-primary hover:underline">
                {purchase.supplierName}
              </Link>
            </DetailRow>
            <DetailRow label="Purchase date">{formatDate(purchase.purchaseDate)}</DetailRow>
            <DetailRow label="Reference">
              {purchase.reference ?? <span className="text-muted-foreground">Not provided</span>}
            </DetailRow>
            <DetailRow label="Total cost">KES {purchase.totalCost}</DetailRow>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-medium">Raw material</th>
                    <th className="p-4 text-right font-medium">Quantity</th>
                    <th className="p-4 text-right font-medium">Unit cost</th>
                    <th className="p-4 text-right font-medium">Line total</th>
                    {hasPumiceItem && <th className="p-4 font-medium">Dimensions / loads</th>}
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-4">{item.rawMaterialName}</td>
                      <td className="p-4 text-right tabular-nums">
                        {item.quantity} {item.measurementUnitSymbol ?? ''}
                      </td>
                      <td className="p-4 text-right tabular-nums">KES {item.unitCost}</td>
                      <td className="p-4 text-right tabular-nums">KES {item.lineTotal}</td>
                      {hasPumiceItem && (
                        <td className="p-4">
                          {item.lengthMetres && item.widthMetres && item.heightMetres && item.numberOfLoads ? (
                            <span className="text-muted-foreground text-xs">
                              {item.lengthMetres} × {item.widthMetres} × {item.heightMetres} m ·{' '}
                              {item.numberOfLoads} loads
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <PurchasePaymentHistory purchaseId={purchase.id} />
      </div>
    </div>
  );
}
