'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormActionsProps {
  submitLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Pins the bar to the bottom of the screen on phones. */
  sticky?: boolean;
}

/**
 * Save and cancel for a form.
 *
 * On a phone the bar sticks to the bottom of the viewport, so the primary
 * action stays reachable on a long form without scrolling back down. Buttons
 * are full width there and normal width on desktop.
 */
export function FormActions({
  submitLabel,
  pendingLabel,
  pending = false,
  onCancel,
  cancelLabel = 'Cancel',
  sticky = true,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-3 sm:flex-row sm:justify-end',
        sticky &&
          'bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 -mx-4 border-t px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none',
      )}
    >
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          className="h-11 sm:w-auto"
          onClick={onCancel}
          disabled={pending}
        >
          {cancelLabel}
        </Button>
      )}
      <Button type="submit" className="h-11 sm:w-auto" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? (pendingLabel ?? 'Saving…') : submitLabel}
      </Button>
    </div>
  );
}
