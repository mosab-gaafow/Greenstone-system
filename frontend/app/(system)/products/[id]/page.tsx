'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { useProduct } from '@/features/products/hooks/use-products';
import { categoryLabel } from '@/features/products/types/product.types';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canManageUsers } from '@/lib/permissions';
import { Package } from 'lucide-react';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentUser();
  const query = useProduct(id);

  if (query.isPending) {
    return (
      <PageContainer title="Product">
        <div className="max-w-xl space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (query.isError) {
    return (
      <PageContainer title="Product">
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
      </PageContainer>
    );
  }

  const product = query.data;

  return (
    <PageContainer
      title={product.name}
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
    >
      <Card className="max-w-xl">
        <CardContent className="space-y-4 pt-6">
          <Row label="Status">
            <StatusBadge isActive={product.isActive} />
          </Row>
          <Row label="Category">{categoryLabel(product.category)}</Row>
          <Row label="Size">{product.size}</Row>
          <Row label="Description">
            {product.description ?? <span className="text-muted-foreground">None</span>}
          </Row>
          <Row label="Price">
            {/* Stated explicitly, so nobody goes looking for a field that
                deliberately does not exist. */}
            <span className="text-muted-foreground">Agreed on each quotation and order</span>
          </Row>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button variant="ghost" render={<Link href="/products" />}>
          <ArrowLeft className="size-4" aria-hidden />
          Back to products
        </Button>
      </div>
    </PageContainer>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium sm:text-right">{children}</span>
    </div>
  );
}
