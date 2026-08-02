'use client';

import { useRouter } from 'next/navigation';
import { ProductFormDialog } from '@/features/products/components/product-form-dialog';
import { useCreateProduct } from '@/features/products/hooks/use-products';

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  return (
    <ProductFormDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.push('/products');
        }
      }}
      pending={createProduct.isPending}
      onSubmit={async (values) => {
        const product = await createProduct.mutateAsync(values);
        router.push(`/products/${product.id}`);
      }}
    />
  );
}
