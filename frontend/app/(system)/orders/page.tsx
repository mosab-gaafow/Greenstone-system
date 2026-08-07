'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListExportButton } from '@/components/shared/list-export-button';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { OrderSummaryCards } from '@/features/orders/components/order-summary-cards';
import { OrderList } from '@/features/orders/components/order-list';
import { orderKeys } from '@/features/orders/hooks/use-orders';

export default function OrdersPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={ShoppingCart}
        title="Orders"
        description="Direct orders for customers."
        secondaryActions={<><ListExportButton source="orders" fileName="Orders" /><Button variant="outline" className="h-11" onClick={() => { void queryClient.invalidateQueries({ queryKey: orderKeys.all }); }}><RefreshCw className="size-4" aria-hidden />Refresh</Button></>}
        action={<Button render={<Link href="/orders/new" />} className="h-11 w-full sm:w-auto"><Plus className="size-4" aria-hidden />Add order</Button>}
      />
      <OrderSummaryCards />
      <Suspense fallback={<ListSkeleton />}>
        <OrderList />
      </Suspense>
    </div>
  );
}
