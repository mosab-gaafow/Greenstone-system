'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/data-display/empty-state';
import { ProductFormDialog } from '@/features/products/components/product-form-dialog';
import { useProduct, useUpdateProduct } from '@/features/products/hooks/use-products';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const query = useProduct(id);
  const updateProduct = useUpdateProduct(id);

  function close() {
    router.push(`/products/${id}`);
  }

  if (query.isPending) {
    return (
      <PageContainer title="Edit product">
        <div className="max-w-xl space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (query.isError) {
    return (
      <PageContainer title="Edit product">
        <EmptyState
          icon={Package}
          title="This product could not be loaded"
          description="It may have been removed, or the link may be wrong."
        />
      </PageContainer>
    );
  }

  return (
    <ProductFormDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      product={query.data}
      pending={updateProduct.isPending}
      onSubmit={async (values) => {
        await updateProduct.mutateAsync(values);
        close();
      }}
    />
  );
}
