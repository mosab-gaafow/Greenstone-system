'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldShell, describedBy } from './field-shell';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Choice from a short, fixed list.
 *
 * For long lists, use SearchableSelect instead — scrolling hundreds of options
 * on a phone is painful.
 */
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select',
  error,
  hint,
  required,
  disabled,
}: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      {/* Base UI can emit null when a selection is cleared; the caller only
          ever wants a string, so it is normalised here rather than in every
          form. */}
      <Select
        value={value ?? ''}
        onValueChange={(next) => {
          onChange(next ?? '');
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="h-11 w-full"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}
