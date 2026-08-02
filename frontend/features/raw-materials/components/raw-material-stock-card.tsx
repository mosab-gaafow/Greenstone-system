'use client';

import { useState } from 'react';
import { PencilLine, SlidersHorizontal, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailRow } from '@/components/data-display/detail-row';
import { Pagination } from '@/components/data-display/pagination';
import { formatDate } from '@/lib/format';
import {
  useAdjustStock,
  useRawMaterialMovements,
  useRawMaterialStock,
  useSetOpeningStock,
} from '../hooks/use-raw-materials';
import { OpeningStockDialog } from './opening-stock-dialog';
import { AdjustStockDialog } from './adjust-stock-dialog';
import { rawMaterialMovementTypeLabel } from '../types/raw-material.types';

interface RawMaterialStockCardProps {
  rawMaterialId: string;
  unitSymbol: string | null;
  /** Admin/Super Admin only — the Accountant may adjust stock but not set the opening quantity. */
  canSetOpening: boolean;
  canAdjust: boolean;
}

export function RawMaterialStockCard({
  rawMaterialId,
  unitSymbol,
  canSetOpening,
  canAdjust,
}: RawMaterialStockCardProps) {
  const [page, setPage] = useState(1);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const stockQuery = useRawMaterialStock(rawMaterialId);
  const movementsQuery = useRawMaterialMovements(rawMaterialId, page);
  const setOpeningStock = useSetOpeningStock(rawMaterialId);
  const adjustStock = useAdjustStock(rawMaterialId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4" aria-hidden />
          Stock
        </CardTitle>
        {(canSetOpening || canAdjust) && (
          <div className="flex gap-2">
            {canSetOpening && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpeningOpen(true);
                }}
              >
                <PencilLine className="size-4" aria-hidden />
                Opening
              </Button>
            )}
            {canAdjust && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdjustOpen(true);
                }}
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                Adjust
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {stockQuery.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : stockQuery.isError ? (
          <p className="text-muted-foreground text-sm">Stock could not be loaded.</p>
        ) : (
          <DetailRow label="Current balance">
            {stockQuery.data.quantity} {unitSymbol ?? ''}
          </DetailRow>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Movement history</h3>

          {movementsQuery.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : movementsQuery.isError ? (
            <p className="text-muted-foreground text-sm">Movements could not be loaded.</p>
          ) : movementsQuery.data.movements.length === 0 ? (
            <p className="text-muted-foreground text-sm">No movements recorded yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 font-medium">Date</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 text-right font-medium">Quantity</th>
                      <th className="p-3 text-right font-medium">Balance after</th>
                      <th className="p-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementsQuery.data.movements.map((movement) => (
                      <tr key={movement.id} className="border-b last:border-0">
                        <td className="p-3 whitespace-nowrap">{formatDate(movement.createdAt)}</td>
                        <td className="p-3">{rawMaterialMovementTypeLabel(movement.movementType)}</td>
                        <td className="p-3 text-right tabular-nums">{movement.quantity}</td>
                        <td className="p-3 text-right tabular-nums">{movement.balanceAfter}</td>
                        <td className="text-muted-foreground p-3">{movement.reason ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={movementsQuery.data.meta.page}
                pageSize={movementsQuery.data.meta.pageSize}
                totalRecords={movementsQuery.data.meta.totalRecords}
                totalPages={movementsQuery.data.meta.totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </CardContent>

      <OpeningStockDialog
        open={openingOpen}
        onOpenChange={setOpeningOpen}
        pending={setOpeningStock.isPending}
        onSubmit={async (values) => {
          await setOpeningStock.mutateAsync(values);
          setOpeningOpen(false);
        }}
      />

      <AdjustStockDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        pending={adjustStock.isPending}
        onSubmit={async (values) => {
          await adjustStock.mutateAsync(values);
          setAdjustOpen(false);
        }}
      />
    </Card>
  );
}
