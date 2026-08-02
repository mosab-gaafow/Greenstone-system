'use client';

import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { LazyMotion, domAnimation, m } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';

export interface SummaryCardItem {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** A short honest note under the number, e.g. "All time". Never an invented stat. */
  caption?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  isLoading?: boolean;
}

const TONE_STYLES: Record<NonNullable<SummaryCardItem['tone']>, string> = {
  default: 'bg-accent text-accent-foreground',
  success: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

/**
 * One connected metrics strip — a single bordered card divided into segments,
 * rather than several small cards floating apart. Only ever fed numbers the
 * backend already returns (a list endpoint's pagination `meta.totalRecords`,
 * filtered a few different ways) — never a number invented on the frontend.
 */
export function SummaryCards({ items }: { items: SummaryCardItem[] }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div variants={fadeUp} initial="hidden" animate="show" className="mb-6">
        <Card
          size="sm"
          style={{ '--summary-cols': Math.min(items.length, 4) } as CSSProperties}
          className="divide-border grid grid-cols-2 divide-y overflow-hidden py-0 sm:divide-x sm:divide-y-0 sm:[grid-template-columns:repeat(var(--summary-cols),minmax(0,1fr))]"
        >
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-3 p-4 sm:p-5">
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg',
                  TONE_STYLES[item.tone ?? 'default'],
                )}
              >
                <item.icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-muted-foreground truncate text-xs font-medium">
                  {item.label}
                </p>
                {item.isLoading ? (
                  <Skeleton className="mt-1.5 h-7 w-12" />
                ) : (
                  <p className="font-heading text-2xl leading-tight font-bold tabular-nums">
                    {item.value}
                  </p>
                )}
                {item.caption && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">{item.caption}</p>
                )}
              </div>
            </div>
          ))}
        </Card>
      </m.div>
    </LazyMotion>
  );
}
