'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Package, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { ProductList } from '@/features/products/components/product-list';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { productKeys } from '@/features/products/hooks/use-products';
import { canManageUsers } from '@/lib/permissions';

export default function ProductsPage() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Package}
        title="Products"
        description="The blocks and pots Greenstone manufactures."
        secondaryActions={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: productKeys.all });
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
        action={
          canManageUsers(user) ? (
            <Button render={<Link href="/products/new" />} className="h-11 w-full sm:w-auto">
              <Plus className="size-4" aria-hidden />
              Add product
            </Button>
          ) : undefined
        }
      />

      {/* useSearchParams needs a Suspense boundary while prerendering. */}
      <Suspense fallback={<ListSkeleton />}>
        <ProductList />
      </Suspense>
    </div>
  );
}
