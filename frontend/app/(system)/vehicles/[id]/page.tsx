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
import { useVehicle } from '@/features/vehicles/hooks/use-vehicles';

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useVehicle(id);

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
          icon={Truck}
          title="This vehicle could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/vehicles" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to vehicles
            </Button>
          }
        />
      </div>
    );
  }

  const vehicle = query.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/vehicles" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to vehicles
      </Button>

      <PageHeader
        icon={Truck}
        title={vehicle.registrationNumber}
        badge={<StatusBadge isActive={vehicle.isActive} />}
        description={vehicle.vehicleType}
        action={
          <Button
            render={<Link href={`/vehicles/${vehicle.id}/edit`} />}
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
            <DetailRow label="Vehicle type">{vehicle.vehicleType}</DetailRow>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Vehicle owner">
              <Link
                href={`/vehicle-owners/${vehicle.vehicleOwnerId}`}
                className="text-primary hover:underline"
              >
                {vehicle.vehicleOwnerName}
              </Link>
            </DetailRow>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
