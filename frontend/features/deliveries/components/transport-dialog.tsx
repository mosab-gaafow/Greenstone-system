'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSetTransport } from '../hooks/use-deliveries';
import {
  transportFormSchema,
  type TransportFormValues,
} from '../schemas/delivery.schema';

interface TransportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  itemCount: number;
  /** Total planned quantity across all items (for single-product display). */
  totalPlanned: number;
  /** maxPiecesPerTruck from the first product if single-product. */
  maxPiecesPerTruck: number | null;
  currentRate: string | null;
  currentTrips: number | null;
  currentCost: string | null;
}

function computeAutoTrips(
  totalPlanned: number,
  maxPieces: number | null,
): number | null {
  if (!maxPieces || maxPieces <= 0) return null;
  return Math.ceil(totalPlanned / maxPieces);
}

export function TransportDialog({
  open,
  onOpenChange,
  deliveryId,
  itemCount,
  totalPlanned,
  maxPiecesPerTruck,
  currentRate,
  currentTrips,
  currentCost,
}: TransportDialogProps) {
  const setTransport = useSetTransport(deliveryId);

  const singleProduct = itemCount === 1;
  const autoTrips = singleProduct
    ? computeAutoTrips(totalPlanned, maxPiecesPerTruck)
    : null;
  const showManualTrips = !singleProduct || !maxPiecesPerTruck;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transportFormSchema),
    defaultValues: {
      transportRate: currentRate ?? '',
      numberOfTrips: currentTrips ?? (autoTrips ?? 0),
    } as TransportFormValues,
  });

  const watchedRate = watch('transportRate');
  const watchedTrips = watch('numberOfTrips');
  const previewCost =
    watchedRate && watchedTrips
      ? (Number(watchedRate) * Number(watchedTrips)).toFixed(2)
      : null;

  function onSubmit(data: { transportRate: string; numberOfTrips?: number }) {
    const values: TransportFormValues = {
      transportRate: data.transportRate,
      numberOfTrips: showManualTrips ? data.numberOfTrips : undefined,
    };
    setTransport.mutate(values, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set transport</DialogTitle>
          <DialogDescription>
            Enter the transport rate per trip.{' '}
            {singleProduct && maxPiecesPerTruck
              ? `Trips are auto-calculated from the product's truck capacity ${maxPiecesPerTruck} pieces per truck.`
              : 'Enter the number of trips for this mixed-product delivery.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transportRate">Transport rate (KES per trip)</Label>
            <Input
              id="transportRate"
              type="text"
              inputMode="decimal"
              placeholder="8500.00"
              {...register('transportRate')}
            />
            {errors.transportRate?.message && (
              <p className="text-destructive text-sm">{errors.transportRate.message}</p>
            )}
          </div>

          {showManualTrips ? (
            <div className="space-y-2">
              <Label htmlFor="numberOfTrips">Number of trips</Label>
              <Input
                id="numberOfTrips"
                type="number"
                min={1}
                placeholder="1"
                {...register('numberOfTrips', { valueAsNumber: true })}
              />
              {errors.numberOfTrips?.message && (
                <p className="text-destructive text-sm">{errors.numberOfTrips.message}</p>
              )}
              {!maxPiecesPerTruck && (
                <p className="text-muted-foreground text-xs">
                  Auto-calculation unavailable — this product has no truck capacity configured.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Total planned quantity</span>
                <span className="font-medium tabular-nums">{totalPlanned}</span>
              </div>
              <div className="flex justify-between">
                <span>Max pieces per truck</span>
                <span className="font-medium tabular-nums">{maxPiecesPerTruck}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Required trips</span>
                <span className="tabular-nums">{autoTrips}</span>
              </div>
              <input type="hidden" value={autoTrips ?? 0} {...register('numberOfTrips', { valueAsNumber: true })} />
            </div>
          )}

          {previewCost && (
            <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
              <Calculator className="size-4 text-muted-foreground" />
              <span>
                Total transport cost:{' '}
                <span className="font-semibold tabular-nums">KES {previewCost}</span>
              </span>
            </div>
          )}

          {currentCost && (
            <p className="text-muted-foreground text-xs">
              Current: KES {currentCost} ({currentTrips} trips × KES {currentRate})
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={setTransport.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={setTransport.isPending}>
              {setTransport.isPending ? 'Saving…' : 'Save transport'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
