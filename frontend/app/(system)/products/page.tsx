'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/page-container';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { ProductList } from '@/features/products/components/product-list';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canManageUsers } from '@/lib/permissions';

export default function ProductsPage() {
  const { user } = useCurrentUser();

  return (
    <PageContainer
      title="Products"
      description="The blocks and pots Greenstone manufactures."
      action={
        canManageUsers(user) ? (
          <Button render={<Link href="/products/new" />} className="h-11 w-full sm:w-auto">
            <Plus className="size-4" aria-hidden />
            Add product
          </Button>
        ) : undefined
      }
    >
      {/* useSearchParams needs a Suspense boundary while prerendering. */}
      <Suspense fallback={<ListSkeleton />}>
        <ProductList />
      </Suspense>
    </PageContainer>
  );
}
