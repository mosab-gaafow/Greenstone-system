'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, PencilLine, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { useDriver } from '@/features/drivers/hooks/use-drivers';

export default function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useDriver(id);

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
          icon={Truck}
          title="This driver could not be loaded"
          description="They may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/drivers" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to drivers
            </Button>
          }
        />
      </div>
    );
  }

  const driver = query.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/drivers" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to drivers
      </Button>

      <PageHeader
        icon={Truck}
        title={driver.name}
        badge={<StatusBadge isActive={driver.isActive} />}
        description={driver.phone}
        action={
          <Button
            render={<Link href={`/drivers/${driver.id}/edit`} />}
            className="h-11 w-full sm:w-auto"
          >
            <PencilLine className="size-4" aria-hidden />
            Edit
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardContent className="space-y-4">
          <DetailRow label="Phone">{driver.phone}</DetailRow>
          <DetailRow label="National ID">{driver.nationalId}</DetailRow>
        </CardContent>
      </Card>
    </div>
  );
}
