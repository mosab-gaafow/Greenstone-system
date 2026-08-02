'use client';

import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/shared/search-input';
import { cn } from '@/lib/utils';

interface TableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  isFiltered: boolean;
  onReset: () => void;
  className?: string;
}

/**
 * Shared search + filters + reset bar for a data table.
 *
 * `onReset` should clear every filter this toolbar controls, including the
 * search box — the caller decides what "cleared" means for its own filters,
 * this component only decides when to show the option.
 */
export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search',
  filters,
  isFiltered,
  onReset,
  className,
}: TableToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {filters}

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Reset filters
          </Button>
        )}
      </div>

      <div className="sm:w-72 sm:shrink-0">
        <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
      </div>
    </div>
  );
}
