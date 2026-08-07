'use client';

import type { LucideIcon } from 'lucide-react';

type KpiTone = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'slate';

const STYLES: Record<KpiTone, string> = {
  blue:   'border-l-blue-500 bg-blue-50/50',
  green:  'border-l-green-500 bg-green-50/50',
  amber:  'border-l-amber-500 bg-amber-50/50',
  red:    'border-l-red-500 bg-red-50/50',
  purple: 'border-l-purple-500 bg-purple-50/50',
  teal:   'border-l-teal-500 bg-teal-50/50',
  slate:  'border-l-slate-400 bg-slate-50/50',
};

const ICON_BG: Record<KpiTone, string> = {
  blue:   'bg-blue-100 text-blue-600',
  green:  'bg-green-100 text-green-600',
  amber:  'bg-amber-100 text-amber-600',
  red:    'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
  teal:   'bg-teal-100 text-teal-600',
  slate:  'bg-slate-100 text-slate-600',
};

interface Props {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  tone?: KpiTone;
  compact?: boolean;
}

export function ReportKpiCard({ icon: Icon, label, value, tone = 'blue', compact }: Props) {
  if (compact) {
    return (
      <div className={`rounded-lg border border-l-[3px] px-3 py-2.5 ${STYLES[tone]}`}>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</div>
        <div className="text-sm font-bold tabular-nums mt-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-l-[3px] p-4 ${STYLES[tone]}`}>
      <div className="flex items-center gap-2.5 mb-1.5">
        {Icon && (
          <div className={`flex items-center justify-center size-8 rounded-lg ${ICON_BG[tone]}`}>
            <Icon className="size-4" />
          </div>
        )}
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );
}
