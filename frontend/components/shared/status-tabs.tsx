'use client';

import { cn } from '@/lib/utils';

export interface StatusTabOption {
  value: string;
  label: string;
  count?: number;
}

interface StatusTabsProps {
  value: string;
  onChange: (value: string) => void;
  options: StatusTabOption[];
  className?: string;
}

/**
 * Segmented status filter — a dark, filled "pill" for the selected option,
 * plain text with a small count chip for the rest.
 *
 * Kept as a single control per filterable dimension. Where a table has only
 * one status field, this replaces the equivalent dropdown filter rather than
 * duplicating it — showing both would filter the same thing twice.
 */
export function StatusTabs({ value, onChange, options, className }: StatusTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'bg-muted inline-flex w-full flex-wrap gap-1 rounded-full p-1 sm:w-auto',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => {
              onChange(option.value);
            }}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
              selected
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                  selected ? 'bg-background/20' : 'bg-background',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
