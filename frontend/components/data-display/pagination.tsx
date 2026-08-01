'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * List pagination.
 *
 * Deliberately Previous/Next rather than numbered pages: on a phone a row of
 * page numbers is a row of targets too small to hit reliably. The count tells
 * the user where they are.
 */
export function Pagination({
  page,
  pageSize,
  totalRecords,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalRecords === 0) {
    return null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalRecords);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        Showing <span className="text-foreground font-medium">{first}</span>–
        <span className="text-foreground font-medium">{last}</span> of{' '}
        <span className="text-foreground font-medium">{totalRecords}</span>
      </p>

      <div className="flex w-full gap-2 sm:w-auto">
        <Button
          variant="outline"
          className="flex-1 sm:flex-none"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Previous
        </Button>
        <Button
          variant="outline"
          className="flex-1 sm:flex-none"
          disabled={page >= totalPages}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
