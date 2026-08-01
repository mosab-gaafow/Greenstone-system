'use client';

import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { FieldShell, describedBy } from './field-shell';

interface TextFieldProps extends Omit<ComponentProps<typeof Input>, 'id'> {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

/**
 * Single-line text input.
 *
 * `inputMode` should be set by the caller for quantities and money, so phones
 * open a numeric keypad instead of the full keyboard.
 */
export function TextField({ id, label, error, hint, required, ...props }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <Input
        id={id}
        className="h-11"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      />
    </FieldShell>
  );
}
