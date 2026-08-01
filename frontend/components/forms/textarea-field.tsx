'use client';

import type { ComponentProps } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { FieldShell, describedBy } from './field-shell';

interface TextareaFieldProps extends Omit<ComponentProps<typeof Textarea>, 'id'> {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function TextareaField({ id, label, error, hint, required, ...props }: TextareaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <Textarea
        id={id}
        rows={3}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      />
    </FieldShell>
  );
}
