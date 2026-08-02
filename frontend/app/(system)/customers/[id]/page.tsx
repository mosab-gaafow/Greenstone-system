'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, PencilLine, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { AddressManager } from '@/features/customers/components/address-manager';
import { CreditStatusCard } from '@/features/customers/components/credit-status-card';
import { useCustomer } from '@/features/customers/hooks/use-customers';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useCustomer(id);

  if (query.isPending) {
    return (
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8">
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
      </div>
    );
  }

  const customer = query.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/customers" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to customers
      </Button>

      <PageHeader
        icon={Users}
        title={customer.name}
        badge={<StatusBadge isActive={customer.isActive} />}
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
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Phone">{customer.phone}</DetailRow>
            <DetailRow label="Email">
              {customer.email ?? <span className="text-muted-foreground">Not provided</span>}
            </DetailRow>
          </CardContent>
        </Card>

        <CreditStatusCard customerId={customer.id} />

        <AddressManager customerId={customer.id} addresses={customer.addresses} canEdit />
      </div>
    </div>
  );
}
