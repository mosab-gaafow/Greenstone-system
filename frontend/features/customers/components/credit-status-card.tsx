'use client';

import { useState } from 'react';
import { PencilLine, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canSetOpeningBalance } from '@/lib/permissions';
import { useCreditStatus, useSetOpeningBalance } from '../hooks/use-customer-credit';
import { OpeningBalanceDialog } from './opening-balance-dialog';
import { creditStatusLabel, type CreditStatus } from '../types/customer-credit.types';

const STATUS_TONE: Record<CreditStatus, StatusTone> = {
  NORMAL: 'success',
  WARNING: 'warning',
  STRONG_WARNING: 'warning',
  BLOCKED: 'danger',
};

/**
 * Customer credit status and opening balance. See business-blueprint sections
 * 2.24 and 2.25.
 *
 * The outstanding balance is never cached on the backend — this always shows
 * a fresh figure, recalculated on every load.
 */
export function CreditStatusCard({ customerId }: { customerId: string }) {
  const { user } = useCurrentUser();
  const query = useCreditStatus(customerId);
  const setOpeningBalance = useSetOpeningBalance(customerId);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4" aria-hidden />
          Credit status
        </CardTitle>
        {canSetOpeningBalance(user) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <PencilLine className="size-4" aria-hidden />
            Opening balance
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : query.isError ? (
          <p className="text-muted-foreground text-sm">Credit status could not be loaded.</p>
        ) : (
          <>
            <DetailRow label="Status">
              <StatusBadge
                tone={STATUS_TONE[query.data.creditStatus]}
                label={creditStatusLabel(query.data.creditStatus)}
              />
            </DetailRow>
            <DetailRow label="Opening balance">KES {query.data.openingBalance}</DetailRow>
            <DetailRow label="Credit orders">KES {query.data.creditOrdersTotal}</DetailRow>
            <DetailRow label="Outstanding balance">KES {query.data.outstandingBalance}</DetailRow>
          </>
        )}
      </CardContent>

      <OpeningBalanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={setOpeningBalance.isPending}
        onSubmit={async (values) => {
          await setOpeningBalance.mutateAsync(values);
          setDialogOpen(false);
        }}
      />
    </Card>
  );
}
