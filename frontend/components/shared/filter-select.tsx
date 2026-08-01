'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  label: string;
  className?: string;
}

/**
 * List filter.
 *
 * Full width on phones so it is easy to hit, fixed width on desktop so the
 * toolbar stays tidy.
 */
export function FilterSelect({ value, onChange, options, label, className }: FilterSelectProps) {
  return (
    // Base UI can emit null when a selection is cleared. Filters always want a
    // string, so it is normalised here.
    <Select
      value={value}
      onValueChange={(next) => {
        onChange(next ?? '');
      }}
    >
      <SelectTrigger className={className ?? 'h-11 w-full sm:w-44'} aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
