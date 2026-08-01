import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Shown when a list has nothing in it.
 *
 * An empty screen is an invitation to act, so it says what to do next rather
 * than only reporting absence.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {Icon && (
        <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <div className="space-y-1">
        <p className="font-heading font-semibold">{title}</p>
        {description && (
          <p className="text-muted-foreground max-w-sm text-sm text-pretty">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
