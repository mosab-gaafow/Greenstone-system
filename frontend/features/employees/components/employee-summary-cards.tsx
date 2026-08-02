'use client';

import { Users, UserCheck, UserX } from 'lucide-react';
import { SummaryCards, type SummaryCardItem } from '@/components/data-display/summary-cards';
import { useEmployeeSummary } from '../hooks/use-employees';

export function EmployeeSummaryCards() {
  const summary = useEmployeeSummary();

  const items: SummaryCardItem[] = [
    {
      label: 'Total employees',
      value: summary.total ?? 0,
      icon: Users,
      caption: 'All time',
      isLoading: summary.isLoading,
    },
    {
      label: 'Active',
      value: summary.active ?? 0,
      icon: UserCheck,
      tone: 'success',
      caption: 'On the payroll',
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
