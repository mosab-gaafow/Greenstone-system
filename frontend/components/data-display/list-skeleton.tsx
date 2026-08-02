import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholder for a record list.
 *
 * Mirrors the responsive list: card-shaped on phones, row-shaped on desktop, so
 * the layout does not jump when the data arrives.
 */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="space-y-2 rounded-xl border p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden rounded-xl border md:block">
        <div className="bg-muted/40 flex items-center gap-4 border-b p-4">
          <Skeleton className="h-3.5 w-1/4" />
          <Skeleton className="h-3.5 w-1/6" />
          <Skeleton className="h-3.5 w-1/6" />
          <Skeleton className="ml-auto h-3.5 w-16" />
        </div>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="ml-auto h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
