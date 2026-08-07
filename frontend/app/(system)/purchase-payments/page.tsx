'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { HandCoins, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListExportButton } from '@/components/shared/list-export-button';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { PurchasePaymentList } from '@/features/purchase-payments/components/purchase-payment-list';
import { purchasePaymentKeys } from '@/features/purchase-payments/hooks/use-purchase-payments';

export default function PurchasePaymentsPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={HandCoins}
        title="Purchase payments"
        description="Payments made to suppliers."
        secondaryActions={<><ListExportButton source="purchase-payments" fileName="Purchase_Payments" /><Button variant="outline" className="h-11" onClick={() => { void queryClient.invalidateQueries({ queryKey: purchasePaymentKeys.all }); }}><RefreshCw className="size-4" aria-hidden />Refresh</Button></>}
        action={<Button render={<Link href="/purchase-payments/new" />} className="h-11 w-full sm:w-auto"><Plus className="size-4" aria-hidden />Record payment</Button>}
      />
      <Suspense fallback={<ListSkeleton />}>
        <PurchasePaymentList />
      </Suspense>
    </div>
  );
}
