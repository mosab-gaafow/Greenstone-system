import { cn } from '@/lib/utils';

/**
 * Record status.
 *
 * Carries both a word and a colour. Colour alone is not enough — it excludes
 * anyone who cannot distinguish the two, and it disappears in bright sunlight
 * on a phone in the yard.
 */
export function StatusBadge({ isActive, className }: { isActive: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        isActive
          ? 'bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-100'
          : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          isActive ? 'bg-brand-500' : 'bg-muted-foreground/50',
        )}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
