'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, PencilLine, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { SupplierBalanceCard } from '@/features/suppliers/components/supplier-balance-card';
import { useSupplier } from '@/features/suppliers/hooks/use-suppliers';

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useSupplier(id);

  if (query.isPending) {
    return (
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon={Warehouse}
          title="This supplier could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/suppliers" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to suppliers
            </Button>
          }
        />
      </div>
    );
  }

  const supplier = query.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/suppliers" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to suppliers
      </Button>

      <PageHeader
        icon={Warehouse}
        title={supplier.name}
        badge={<StatusBadge isActive={supplier.isActive} />}
        description={supplier.phone}
        action={
          <Button
            render={<Link href={`/suppliers/${supplier.id}/edit`} />}
            className="h-11 w-full sm:w-auto"
          >
            <PencilLine className="size-4" aria-hidden />
            Edit
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Phone">{supplier.phone}</DetailRow>
            <DetailRow label="Email">
              {supplier.email ?? <span className="text-muted-foreground">Not provided</span>}
            </DetailRow>
            <DetailRow label="Address">
              {supplier.address ?? <span className="text-muted-foreground">Not provided</span>}
            </DetailRow>
          </CardContent>
        </Card>

        <SupplierBalanceCard supplierId={supplier.id} />
      </div>
    </div>
  );
}
