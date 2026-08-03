'use client';

import { useState } from 'react';
import { PencilLine, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge } from '@/components/data-display/status-badge';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canSetSupplierOpeningBalance } from '@/lib/permissions';
import { useSetSupplierOpeningBalance, useSupplierBalance } from '../hooks/use-supplier-balance';
import { OpeningBalanceDialog } from './opening-balance-dialog';

/**
 * Supplier opening balance and outstanding balance (Phase 7A). See
 * business-blueprint section 2.18.
 *
 * The outstanding balance is never cached on the backend — this always shows
 * a fresh figure, recalculated on every load. Equals the opening balance
 * alone until Purchases and Purchase Payments exist (Phase 7C/7D).
 */
export function SupplierBalanceCard({ supplierId }: { supplierId: string }) {
  const { user } = useCurrentUser();
  const query = useSupplierBalance(supplierId);
  const setOpeningBalance = useSetSupplierOpeningBalance(supplierId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasBalance = query.data ? Number(query.data.outstandingBalance) > 0 : false;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4" aria-hidden />
          Balance
        </CardTitle>
        {canSetSupplierOpeningBalance(user) && (
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
          <p className="text-muted-foreground text-sm">Balance could not be loaded.</p>
        ) : (
          <>
            <DetailRow label="Status">
              <StatusBadge
                tone={hasBalance ? 'warning' : 'success'}
                label={hasBalance ? 'Outstanding balance' : 'No outstanding balance'}
              />
            </DetailRow>
            <DetailRow label="Opening balance">KES {query.data.openingBalance}</DetailRow>
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
