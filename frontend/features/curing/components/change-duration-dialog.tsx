'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TextareaField } from '@/components/forms/textarea-field';
import {
  changeCuringDurationFormSchema,
  type ChangeCuringDurationFormValues,
} from '../schemas/curing.schema';

interface ChangeDurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ChangeCuringDurationFormValues) => Promise<unknown>;
  pending: boolean;
}

/** Shortens a three-day curing record to two days. One-directional only. */
export function ChangeDurationDialog({ open, onOpenChange, onSubmit, pending }: ChangeDurationDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangeCuringDurationFormValues>({
    resolver: zodResolver(changeCuringDurationFormSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ reason: '' });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change curing duration to 2 days</DialogTitle>
          <DialogDescription>
            Only a three-day record can be changed, and only to two days. The original duration
            stays visible, and this action is audited.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
          noValidate
        >
          <TextareaField
            id="reason"
            label="Reason"
            required
            placeholder="Why this curing record needs to release sooner."
            error={errors.reason?.message}
            {...register('reason')}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
