'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, PencilLine, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { AddressManager } from '@/features/customers/components/address-manager';
import { useCustomer } from '@/features/customers/hooks/use-customers';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useCustomer(id);

  if (query.isPending) {
    return (
      <PageContainer title="Customer">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (query.isError) {
    return (
      <PageContainer title="Customer">
        <EmptyState
          icon={Users}
          title="This customer could not be loaded"
          description="They may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/customers" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to customers
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const customer = query.data;

  return (
    <PageContainer
      title={customer.name}
      description={customer.phone}
      action={
        <Button
          render={<Link href={`/customers/${customer.id}/edit`} />}
          className="h-11 w-full sm:w-auto"
        >
          <PencilLine className="size-4" aria-hidden />
          Edit
        </Button>
      }
    >
      <div className="max-w-2xl space-y-8">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Row label="Status">
              <StatusBadge isActive={customer.isActive} />
            </Row>
            <Row label="Phone">{customer.phone}</Row>
            <Row label="Email">
              {customer.email ?? <span className="text-muted-foreground">None</span>}
            </Row>
          </CardContent>
        </Card>

        <AddressManager customerId={customer.id} addresses={customer.addresses} canEdit />

        <Button variant="ghost" render={<Link href="/customers" />}>
          <ArrowLeft className="size-4" aria-hidden />
          Back to customers
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
