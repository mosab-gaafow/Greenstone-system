'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canAdjustStock, canSetStockOpening } from '@/lib/permissions';
import { RawMaterialDialog } from '@/features/raw-materials/components/raw-material-dialog';
import { RawMaterialStockCard } from '@/features/raw-materials/components/raw-material-stock-card';
import { useRawMaterial, useUpdateRawMaterial } from '@/features/raw-materials/hooks/use-raw-materials';

export default function RawMaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentUser();
  const query = useRawMaterial(id);
  const updateMaterial = useUpdateRawMaterial(id);
  const [editOpen, setEditOpen] = useState(false);

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
          icon={FlaskConical}
          title="This raw material could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/raw-materials" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to raw materials
            </Button>
          }
        />
      </div>
    );
  }

  const material = query.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/raw-materials" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to raw materials
      </Button>

      <PageHeader
        icon={FlaskConical}
        title={material.name}
        badge={<StatusBadge isActive={material.isActive} />}
        description={material.measurementUnitName}
        action={
          <Button
            className="h-11 w-full sm:w-auto"
            onClick={() => {
              setEditOpen(true);
            }}
          >
            <PencilLine className="size-4" aria-hidden />
            Edit
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Measurement unit">
              {material.measurementUnitSymbol
                ? `${material.measurementUnitName} (${material.measurementUnitSymbol})`
                : material.measurementUnitName}
            </DetailRow>
            <DetailRow label="Reorder level">
              {material.reorderLevel ?? <span className="text-muted-foreground">Not set</span>}
            </DetailRow>
          </CardContent>
        </Card>

        <RawMaterialStockCard
          rawMaterialId={material.id}
          unitSymbol={material.measurementUnitSymbol}
          canSetOpening={canSetStockOpening(user)}
          canAdjust={canAdjustStock(user)}
        />
      </div>

      <RawMaterialDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        rawMaterial={material}
        pending={updateMaterial.isPending}
        onSubmit={async (values) => {
          await updateMaterial.mutateAsync(values);
          setEditOpen(false);
        }}
      />
    </div>
  );
}
