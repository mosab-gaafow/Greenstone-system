'use client';

import { StatusTabs } from '@/components/shared/status-tabs';
import { useVehicleSummary } from '../hooks/use-vehicles';

interface VehicleStatusTabsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Reuses the same counts already fetched for the summary metrics above it. */
export function VehicleStatusTabs({ value, onChange, className }: VehicleStatusTabsProps) {
  const summary = useVehicleSummary();

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
