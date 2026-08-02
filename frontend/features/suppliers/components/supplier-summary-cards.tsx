'use client';

import { Warehouse, CheckCircle2, XCircle } from 'lucide-react';
import { SummaryCards, type SummaryCardItem } from '@/components/data-display/summary-cards';
import { useSupplierSummary } from '../hooks/use-suppliers';

export function SupplierSummaryCards() {
  const summary = useSupplierSummary();

  const items: SummaryCardItem[] = [
    {
      label: 'Total suppliers',
      value: summary.total ?? 0,
      icon: Warehouse,
      caption: 'All time',
      isLoading: summary.isLoading,
    },
    {
      label: 'Active',
      value: summary.active ?? 0,
      icon: CheckCircle2,
      tone: 'success',
      caption: 'Available for purchases',
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
