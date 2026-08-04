'use client';

import { Truck, Calendar } from 'lucide-react';
import { SummaryCards, type SummaryCardItem } from '@/components/data-display/summary-cards';
import { useDeliverySummary } from '../hooks/use-deliveries';

export function DeliverySummaryCards() {
  const summary = useDeliverySummary();

  const items: SummaryCardItem[] = [
    {
      label: 'Total deliveries',
      value: summary.total ?? 0,
      icon: Truck,
      caption: 'All time',
      isLoading: summary.isLoading,
    },
    {
      label: 'Planned',
      value: summary.planned ?? 0,
      icon: Calendar,
      caption: 'Awaiting dispatch',
      isLoading: summary.isLoading,
    },
  ];

  return <SummaryCards items={items} />;
}
