'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { ProductForm } from '@/features/products/components/product-form';
import { useCreateProduct } from '@/features/products/hooks/use-products';

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  return (
    <PageContainer title="Add product" description="Add a product to the master list.">
      <ProductForm
        pending={createProduct.isPending}
        onSubmit={async (values) => {
          const product = await createProduct.mutateAsync(values);
          router.push(`/products/${product.id}`);
        }}
      />
    </PageContainer>
  );
}
