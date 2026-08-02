import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  /** A status pill shown inline right after the title — e.g. Active/Inactive. */
  badge?: ReactNode;
  description?: string;
  /** One clear primary action per screen, per the mobile UI rules. */
  action?: ReactNode;
  /** Less common actions — kept out of the primary action's way. */
  secondaryActions?: ReactNode;
  className?: string;
}

/**
 * Standard page heading: icon, title, description and actions.
 *
 * Separate from `PageContainer` so a page can add summary cards or a toolbar
 * between the heading and its content without fighting the container's own
 * layout.
 */
export function PageHeader({
  icon: Icon,
  title,
  badge,
  description,
  action,
  secondaryActions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-primary text-2xl font-extrabold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {badge}
          </div>
          {description && <p className="text-muted-foreground text-pretty">{description}</p>}
        </div>
      </div>

      {(action || secondaryActions) && (
        <div className="flex shrink-0 items-center gap-2">
          {secondaryActions}
          {action}
        </div>
      )}
    </div>
  );
}
