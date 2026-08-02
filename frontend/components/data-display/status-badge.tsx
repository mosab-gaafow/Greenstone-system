import { cn } from '@/lib/utils';

/**
 * Semantic status tones.
 *
 * Independent of the application's accent colour on purpose — a badge should
 * mean the same thing (paid, blocked, waiting...) no matter what the brand
 * colour is. Every tone pairs a colour with text, never colour alone, so
 * status is still readable in bright sunlight or for a colour-blind user.
 */
export type StatusTone = 'success' | 'neutral' | 'info' | 'warning' | 'danger';

const TONE_STYLES: Record<StatusTone, string> = {
  success: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

interface StatusBadgeToneProps {
  tone: StatusTone;
  label: string;
  className?: string;
}

interface StatusBadgeActiveProps {
  isActive: boolean;
  tone?: never;
  label?: never;
  className?: string;
}

type StatusBadgeProps = StatusBadgeToneProps | StatusBadgeActiveProps;

/**
 * Record status.
 *
 * Two ways to use it:
 * - `isActive` — the common Active/Inactive case used across master data.
 * - `tone` + `label` — any other status (Draft, Pending, Approved, Blocked,
 *   Cancelled, ...) once a module needs it.
 */
export function StatusBadge(props: StatusBadgeProps) {
  const { tone, label } =
    'tone' in props && props.tone
      ? { tone: props.tone, label: props.label }
      : {
          tone: (props as StatusBadgeActiveProps).isActive
            ? ('success' as const)
            : ('neutral' as const),
          label: (props as StatusBadgeActiveProps).isActive ? 'Active' : 'Inactive',
        };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        TONE_STYLES[tone],
        props.className,
      )}
    >
      {label}
    </span>
  );
}
