'use client';

import { StatusTabs } from '@/components/shared/status-tabs';
import { useQuotationSummary } from '../hooks/use-quotations';

interface QuotationStatusTabsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Reuses the same counts already fetched for the summary metrics above it. */
export function QuotationStatusTabs({ value, onChange, className }: QuotationStatusTabsProps) {
  const summary = useQuotationSummary();

  return (
    <StatusTabs
      value={value}
      onChange={onChange}
      className={className}
      options={[
        { value: 'all', label: 'All', count: summary.total },
        { value: 'DRAFT', label: 'Draft', count: summary.draft },
        { value: 'ACCEPTED', label: 'Accepted', count: summary.accepted },
      ]}
    />
  );
}
