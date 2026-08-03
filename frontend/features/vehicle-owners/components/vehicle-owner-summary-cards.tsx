'use client';

import { Building2, UserCheck, UserX } from 'lucide-react';
import { SummaryCards, type SummaryCardItem } from '@/components/data-display/summary-cards';
import { useVehicleOwnerSummary } from '../hooks/use-vehicle-owners';

export function VehicleOwnerSummaryCards() {
  const summary = useVehicleOwnerSummary();

  const items: SummaryCardItem[] = [
    {
      label: 'Total vehicle owners',
      value: summary.total ?? 0,
      icon: Building2,
      caption: 'All time',
      isLoading: summary.isLoading,
    },
    {
      label: 'Active',
      value: summary.active ?? 0,
      icon: UserCheck,
      tone: 'success',
      caption: 'Available for vehicles',
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
