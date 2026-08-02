import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
}

/**
 * A titled group of related fields.
 *
 * Long forms are much easier to work through on a phone when they are broken
 * into named sections rather than one continuous run of inputs.
 */
export function FormSection({ title, description, icon: Icon, children }: FormSectionProps) {
  return (
    <section className="space-y-4">
      <div className="border-border/70 flex items-center gap-2 border-b pb-2.5">
        {Icon && <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />}
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {title}
        </h2>
      </div>
      {description && <p className="text-muted-foreground -mt-2 text-sm">{description}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}
