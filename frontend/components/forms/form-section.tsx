import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * A titled group of related fields.
 *
 * Long forms are much easier to work through on a phone when they are broken
 * into named sections rather than one continuous run of inputs.
 */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
