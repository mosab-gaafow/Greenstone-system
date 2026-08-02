'use client';

import { Truck, UserCheck, UserX } from 'lucide-react';
import { SummaryCards, type SummaryCardItem } from '@/components/data-display/summary-cards';
import { useDriverSummary } from '../hooks/use-drivers';

export function DriverSummaryCards() {
  const summary = useDriverSummary();

  const items: SummaryCardItem[] = [
    {
      label: 'Total drivers',
      value: summary.total ?? 0,
      icon: Truck,
      caption: 'All time',
      isLoading: summary.isLoading,
    },
    {
      label: 'Active',
      value: summary.active ?? 0,
      icon: UserCheck,
      tone: 'success',
      caption: 'Available for delivery',
      isLoading: summary.isLoading,
    },
    {
      label: 'Inactive',
      value: summary.inactive ?? 0,
      icon: UserX,
      caption: 'Deactivated',
      isLoading: summary.isLoading,
    },
  ];

  return <SummaryCards items={items} />;
}
