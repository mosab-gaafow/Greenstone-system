'use client';

import { StatusTabs } from '@/components/shared/status-tabs';
import { useOrderSummary } from '../hooks/use-orders';

interface OrderPaymentTypeTabsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Reuses the same counts already fetched for the summary metrics above it. */
export function OrderPaymentTypeTabs({ value, onChange, className }: OrderPaymentTypeTabsProps) {
  const summary = useOrderSummary();

  return (
    <StatusTabs
      value={value}
      onChange={onChange}
      className={className}
      options={[
        { value: 'all', label: 'All', count: summary.total },
        { value: 'CASH', label: 'Cash', count: summary.cash },
        { value: 'CREDIT', label: 'Credit', count: summary.credit },
      ]}
    />
  );
}
