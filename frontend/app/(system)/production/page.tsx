'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Factory, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListExportButton } from '@/components/shared/list-export-button';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { ProductionList } from '@/features/production/components/production-list';
import { productionKeys } from '@/features/production/hooks/use-production';

export default function ProductionPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Factory}
        title="Production"
        description="Production batches and raw-material usage."
        secondaryActions={<><ListExportButton source="production" fileName="Production" /><Button variant="outline" className="h-11" onClick={() => { void queryClient.invalidateQueries({ queryKey: productionKeys.all }); }}><RefreshCw className="size-4" aria-hidden />Refresh</Button></>}
        action={<Button render={<Link href="/production/new" />} className="h-11 w-full sm:w-auto"><Plus className="size-4" aria-hidden />New batch</Button>}
      />
      <Suspense fallback={<ListSkeleton />}>
        <ProductionList />
      </Suspense>
    </div>
  );
}
