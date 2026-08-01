import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldShellProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Label, control, hint and error, arranged the same way everywhere.
 *
 * Errors sit directly below the field they belong to, per the approved form
 * rules, and are wired to the control with `aria-describedby` by the calling
 * field component.
 */
export function FieldShell({
  id,
  label,
  error,
  hint,
  required = false,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-[0.8125rem] font-medium">
        {label}
        {required && (
          <span className="text-destructive ml-0.5" aria-hidden>
            *
          </span>
        )}
      </Label>

      {children}

      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground text-[0.8125rem]">
          {hint}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="text-destructive text-[0.8125rem]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Builds the aria-describedby value for a field. */
export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) {
    return `${id}-error`;
  }
  if (hint) {
    return `${id}-hint`;
  }
  return undefined;
}
