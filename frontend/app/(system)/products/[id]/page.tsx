'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { useProduct } from '@/features/products/hooks/use-products';
import { categoryLabel } from '@/features/products/types/product.types';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canManageUsers } from '@/lib/permissions';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentUser();
  const query = useProduct(id);

  if (query.isPending) {
    return (
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon={Package}
          title="This product could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/products" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to products
            </Button>
          }
        />
      </div>
    );
  }

  const product = query.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/products" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to products
      </Button>

      <PageHeader
        icon={Package}
        title={product.name}
        badge={<StatusBadge isActive={product.isActive} />}
        description={`${categoryLabel(product.category)} · ${product.size}`}
        action={
          canManageUsers(user) ? (
            <Button
              render={<Link href={`/products/${product.id}/edit`} />}
              className="h-11 w-full sm:w-auto"
            >
              <PencilLine className="size-4" aria-hidden />
              Edit
            </Button>
          ) : undefined
        }
      />

      <Card className="max-w-2xl">
        <CardContent className="space-y-4">
          <DetailRow label="Category">{categoryLabel(product.category)}</DetailRow>
          <DetailRow label="Size">{product.size}</DetailRow>
          <DetailRow label="Description">
            {product.description ?? <span className="text-muted-foreground">None</span>}
          </DetailRow>
          <DetailRow label="Price">
            {/* Stated explicitly, so nobody goes looking for a field that
                deliberately does not exist. */}
            <span className="text-muted-foreground">Agreed on each quotation and order</span>
          </DetailRow>
        </CardContent>
      </Card>
    </div>
  );
}
