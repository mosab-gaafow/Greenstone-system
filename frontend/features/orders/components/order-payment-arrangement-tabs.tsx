'use client';

import { StatusTabs } from '@/components/shared/status-tabs';
import { useOrderSummary } from '../hooks/use-orders';

interface OrderPaymentArrangementTabsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Reuses the same counts already fetched for the summary metrics above it. */
export function OrderPaymentArrangementTabs({
  value,
  onChange,
  className,
}: OrderPaymentArrangementTabsProps) {
  const summary = useOrderSummary();

  return (
    <StatusTabs
      value={value}
      onChange={onChange}
      className={className}
      options={[
        { value: 'all', label: 'All', count: summary.total },
        { value: 'PREPAID', label: 'Prepaid', count: summary.prepaid },
        { value: 'CREDIT', label: 'Credit', count: summary.credit },
      ]}
    />
  );
}
