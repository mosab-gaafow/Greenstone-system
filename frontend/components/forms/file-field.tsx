'use client';

import { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldShell, describedBy } from './field-shell';

interface FileFieldProps {
  id: string;
  label: string;
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
}

/**
 * Single optional file input — the first file-upload field in this app
 * (Phase 7D, purchase-payment evidence; Phase 9's customer-payment evidence
 * will reuse it). Deliberately not React Hook Form-registered: a file isn't
 * a plain serialisable form value, so its state lives in the parent form
 * component as ordinary `File | null` state instead.
 */
export function FileField({
  id,
  label,
  value,
  onChange,
  accept,
  error,
  hint,
  required,
}: FileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null);
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => {
            inputRef.current?.click();
          }}
        >
          <Upload className="size-4" aria-hidden />
          {value ? 'Change file' : 'Choose file'}
        </Button>
        {value && (
          <>
            <span className="text-muted-foreground min-w-0 truncate text-sm">{value.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove file"
              onClick={() => {
                onChange(null);
                if (inputRef.current) {
                  inputRef.current.value = '';
                }
              }}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </>
        )}
      </div>
    </FieldShell>
  );
}
