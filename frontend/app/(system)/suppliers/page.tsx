'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { SupplierSummaryCards } from '@/features/suppliers/components/supplier-summary-cards';
import { SupplierList } from '@/features/suppliers/components/supplier-list';
import { supplierKeys } from '@/features/suppliers/hooks/use-suppliers';

export default function SuppliersPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Warehouse}
        title="Suppliers"
        description="The suppliers Greenstone buys raw materials from."
        secondaryActions={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: supplierKeys.all });
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
        action={
          <Button render={<Link href="/suppliers/new" />} className="h-11 w-full sm:w-auto">
            <Plus className="size-4" aria-hidden />
            Add supplier
          </Button>
        }
      />

      <SupplierSummaryCards />

      {/* useSearchParams needs a Suspense boundary while prerendering. */}
      <Suspense fallback={<ListSkeleton />}>
        <SupplierList />
      </Suspense>
    </div>
  );
}
