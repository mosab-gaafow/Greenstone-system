'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Layers, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canChangeCuringDuration, canReleaseCuring } from '@/lib/permissions';
import {
  useChangeCuringDuration,
  useCuringRecord,
  useReleaseCuring,
} from '@/features/curing/hooks/use-curing';
import { ChangeDurationDialog } from '@/features/curing/components/change-duration-dialog';
import { ReleaseCuringDialog } from '@/features/curing/components/release-curing-dialog';
import { Countdown } from '@/features/curing/components/countdown';
import { curingDurationLabel } from '@/features/production/types/production.types';
import { formatDateTime } from '@/lib/format';

export default function CuringDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentUser();
  const query = useCuringRecord(id);
  const changeDuration = useChangeCuringDuration(id);
  const releaseCuring = useReleaseCuring(id);
  const [durationDialogOpen, setDurationDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);

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
          icon={Layers}
          title="This curing record could not be loaded"
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/curing" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to curing
            </Button>
          }
        />
      </div>
    );
  }

  const record = query.data;
  const released = record.status === 'RELEASED';
  const releasable = record.status === 'READY_FOR_RELEASE';
  const inProgress = record.status === 'IN_PROGRESS';
  const statusTone: StatusTone = released ? 'success' : releasable ? 'warning' : 'neutral';
  const statusLabel = released ? 'Released' : releasable ? 'Ready to release' : 'Curing';

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/curing" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to curing
      </Button>

      <PageHeader
        icon={Layers}
        title={record.productName}
        badge={<StatusBadge tone={statusTone} label={statusLabel} />}
        description={record.productionNumber}
      />

      {/* Countdown while in progress */}
      {inProgress && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">Time remaining:</span>
          <Countdown plannedCompletion={record.plannedCompletion} />
        </div>
      )}

      {!released && (
        <div className="flex flex-wrap gap-2">
          {canChangeCuringDuration(user) && record.currentDuration === 'THREE_DAYS' && (
            <Button
              variant="outline"
              onClick={() => {
                setDurationDialogOpen(true);
              }}
            >
              <Clock className="size-4" aria-hidden />
              Change to 2 days
            </Button>
          )}
          {canReleaseCuring(user) && (
            <Button
              disabled={!releasable}
              onClick={() => {
                setReleaseDialogOpen(true);
              }}
            >
              <PencilLine className="size-4" aria-hidden />
              {releasable ? 'Release' : 'Not yet releasable'}
            </Button>
          )}
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <DetailRow label="Quantity entering curing">{record.quantityEntering}</DetailRow>
            <DetailRow label="Original duration">{curingDurationLabel(record.originalDuration)}</DetailRow>
            <DetailRow label="Current duration">{curingDurationLabel(record.currentDuration)}</DetailRow>
            <DetailRow label="Started">{formatDateTime(record.startedAt)}</DetailRow>
            <DetailRow label="Planned completion">{formatDateTime(record.plannedCompletion)}</DetailRow>
            {record.durationChangeReason && (
              <DetailRow label="Duration change reason">{record.durationChangeReason}</DetailRow>
            )}
            {released && (
              <>
                <DetailRow label="Released">{formatDateTime(record.actualRelease as string)}</DetailRow>
                <DetailRow label="Broken during curing">{record.brokenQuantity}</DetailRow>
                <DetailRow label="Released quantity">{record.releasedQuantity}</DetailRow>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ChangeDurationDialog
        open={durationDialogOpen}
        onOpenChange={setDurationDialogOpen}
        pending={changeDuration.isPending}
        onSubmit={async (values) => {
          await changeDuration.mutateAsync(values);
          setDurationDialogOpen(false);
        }}
      />

      <ReleaseCuringDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        quantityEntering={record.quantityEntering}
        pending={releaseCuring.isPending}
        onSubmit={async (values) => {
          await releaseCuring.mutateAsync(values);
          setReleaseDialogOpen(false);
        }}
      />
    </div>
  );
}
