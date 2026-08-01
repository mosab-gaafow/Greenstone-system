'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FieldShell, describedBy } from './field-shell';
import type { SelectOption } from './select-field';

interface SearchableSelectProps {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Choice from a long list, with type-to-filter.
 *
 * Required by the approved form rules for customers, products, suppliers,
 * drivers and vehicles — lists that grow well past what anyone wants to scroll
 * on a phone.
 */
export function SearchableSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select',
  searchPlaceholder = 'Type to search',
  emptyMessage = 'Nothing found.',
  error,
  hint,
  required,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-expanded={open}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy(id, error, hint)}
              className={cn(
                'h-11 w-full justify-between font-normal',
                !selected && 'text-muted-foreground',
              )}
            >
              <span className="truncate">{selected?.label ?? placeholder}</span>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
            </Button>
          }
        />
        <PopoverContent className="w-[--anchor-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} className="h-11" />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        option.value === value ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
}
