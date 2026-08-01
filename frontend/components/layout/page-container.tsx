import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  title: string;
  description?: string;
  /** One clear primary action per screen, per the mobile UI rules. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Standard page wrapper.
 *
 * Every business screen uses this, so headings, spacing and the position of the
 * primary action stay consistent across the system.
 */
export function PageContainer({
  title,
  description,
  action,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8', className)}>
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="text-muted-foreground text-pretty">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {children}
    </div>
  );
}
