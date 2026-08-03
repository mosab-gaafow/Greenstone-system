'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { useVehicleOwner } from '@/features/vehicle-owners/hooks/use-vehicle-owners';

export default function VehicleOwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useVehicleOwner(id);

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
          icon={Building2}
          title="This vehicle owner could not be loaded"
          description="They may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/vehicle-owners" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to vehicle owners
            </Button>
          }
        />
      </div>
    );
  }

  const vehicleOwner = query.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/vehicle-owners" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to vehicle owners
      </Button>

      <PageHeader
        icon={Building2}
        title={vehicleOwner.name}
        badge={<StatusBadge isActive={vehicleOwner.isActive} />}
        description={vehicleOwner.phone}
        action={
          <Button
            render={<Link href={`/vehicle-owners/${vehicleOwner.id}/edit`} />}
            className="h-11 w-full sm:w-auto"
          >
            <PencilLine className="size-4" aria-hidden />
            Edit
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardContent className="space-y-4">
          <DetailRow label="Phone">{vehicleOwner.phone}</DetailRow>
          <DetailRow label="National ID">
            {vehicleOwner.nationalId ?? <span className="text-muted-foreground">Not provided</span>}
          </DetailRow>
        </CardContent>
      </Card>
    </div>
  );
}
