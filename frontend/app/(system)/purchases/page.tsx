'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListExportButton } from '@/components/shared/list-export-button';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { PurchaseList } from '@/features/purchases/components/purchase-list';
import { purchaseKeys } from '@/features/purchases/hooks/use-purchases';

export default function PurchasesPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={ClipboardList}
        title="Purchases"
        description="Raw-material purchases from suppliers."
        secondaryActions={<><ListExportButton source="purchases" fileName="Purchases" /><Button variant="outline" className="h-11" onClick={() => { void queryClient.invalidateQueries({ queryKey: purchaseKeys.all }); }}><RefreshCw className="size-4" aria-hidden />Refresh</Button></>}
        action={<Button render={<Link href="/purchases/new" />} className="h-11 w-full sm:w-auto"><Plus className="size-4" aria-hidden />Add purchase</Button>}
      />
      <Suspense fallback={<ListSkeleton />}>
        <PurchaseList />
      </Suspense>
    </div>
  );
}
