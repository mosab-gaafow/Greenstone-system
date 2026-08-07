'use client';

import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const PERIODS = [
  { key: 'today', label: 'Today', getRange: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return { from: d, to: new Date() }; } },
  { key: 'yesterday', label: 'Yesterday', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return { from: d, to: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) }; } },
  { key: 'week', label: 'This week', getRange: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return { from: d, to: new Date() }; } },
  { key: '7d', label: 'Last 7 days', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return { from: d, to: new Date() }; } },
  { key: 'month', label: 'This month', getRange: () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return { from: d, to: new Date() }; } },
  { key: 'lastMonth', label: 'Last month', getRange: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); d.setHours(0, 0, 0, 0); return { from: d, to: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999) }; } },
  { key: '3m', label: 'Last 3 months', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 89); d.setHours(0, 0, 0, 0); return { from: d, to: new Date() }; } },
  { key: 'year', label: 'This year', getRange: () => { const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return { from: d, to: new Date() }; } },
  { key: 'custom', label: 'Custom', getRange: () => ({ from: new Date(), to: new Date() }) },
] as const;

type PeriodKey = typeof PERIODS[number]['key'];

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportFiltersProps {
  period: PeriodKey;
  onPeriodChange: (key: PeriodKey) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  /** Optional extra filters to render below the date section */
  children?: React.ReactNode;
}

const DEFAULT_PERIOD: PeriodKey = 'month';

export function useReportFilters(defaultPeriod: PeriodKey = DEFAULT_PERIOD) {
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(() => {
    const p = PERIODS.find((x) => x.key === period)!;
    if (period === 'custom' && customFrom && customTo) {
      return { from: new Date(customFrom), to: new Date(customTo + 'T23:59:59.999Z') };
    }
    return p.getRange();
  }, [period, customFrom, customTo]);

  const toISODate = (d: Date) => d.toISOString().split('T')[0]!;

  return {
    period,
    setPeriod,
    range: { from: toISODate(range.from), to: toISODate(range.to) },
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    filters: { period, onPeriodChange: setPeriod, from: customFrom, to: customTo, onFromChange: setCustomFrom, onToChange: setCustomTo } as ReportFiltersProps,
  };
}

export function ReportFilterSheet({ filters, children }: { filters: ReportFiltersProps; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => setOpen(true)}>
        <Filter className="size-3.5" />Filter
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
          <SheetHeader><SheetTitle>Filter period</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              {PERIODS.filter((p) => p.key !== 'custom').map((p) => (
                <Button
                  key={p.key}
                  variant={filters.period === p.key ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start"
                  onClick={() => { filters.onPeriodChange(p.key); setOpen(false); }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <Button
              variant={filters.period === 'custom' ? 'default' : 'outline'}
              size="sm"
              className="w-full justify-start"
              onClick={() => filters.onPeriodChange('custom')}
            >
              Custom
            </Button>
            {filters.period === 'custom' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">From</label>
                  <input
                    type="date"
                    className="w-full h-9 rounded border px-2 text-sm bg-card"
                    value={filters.from}
                    onChange={(e) => filters.onFromChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">To</label>
                  <input
                    type="date"
                    className="w-full h-9 rounded border px-2 text-sm bg-card"
                    value={filters.to}
                    onChange={(e) => filters.onToChange(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={!filters.from || !filters.to}
                >
                  Apply
                </Button>
              </div>
            )}

            {/* Extra filters */}
            {children && <div className="pt-2 border-t">{children}</div>}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
