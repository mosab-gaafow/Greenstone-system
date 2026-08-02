'use client';

import { StatusTabs } from '@/components/shared/status-tabs';
import { useCustomerSummary } from '../hooks/use-customers';

interface CustomerStatusTabsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Reuses the same counts already fetched for the summary metrics above it. */
export function CustomerStatusTabs({ value, onChange, className }: CustomerStatusTabsProps) {
  const summary = useCustomerSummary();

  return (
    <StatusTabs
      value={value}
      onChange={onChange}
      className={className}
      options={[
        { value: 'all', label: 'All', count: summary.total },
        { value: 'active', label: 'Active', count: summary.active },
        { value: 'inactive', label: 'Inactive', count: summary.inactive },
      ]}
    />
  );
}
