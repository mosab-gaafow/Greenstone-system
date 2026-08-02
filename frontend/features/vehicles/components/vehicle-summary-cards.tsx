'use client';

import { Truck, CheckCircle2, XCircle } from 'lucide-react';
import { SummaryCards, type SummaryCardItem } from '@/components/data-display/summary-cards';
import { useVehicleSummary } from '../hooks/use-vehicles';

export function VehicleSummaryCards() {
  const summary = useVehicleSummary();

  const items: SummaryCardItem[] = [
    {
      label: 'Total vehicles',
      value: summary.total ?? 0,
      icon: Truck,
      caption: 'All time',
      isLoading: summary.isLoading,
    },
    {
      label: 'Active',
      value: summary.active ?? 0,
      icon: CheckCircle2,
      tone: 'success',
      caption: 'Available for delivery',
      isLoading: summary.isLoading,
    },
    {
      label: 'Inactive',
      value: summary.inactive ?? 0,
      icon: XCircle,
      caption: 'Deactivated',
      isLoading: summary.isLoading,
    },
  ];

  return <SummaryCards items={items} />;
}
