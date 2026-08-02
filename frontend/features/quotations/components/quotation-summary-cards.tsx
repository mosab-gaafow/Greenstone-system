'use client';

import { FileText, FileCheck, FileClock } from 'lucide-react';
import { SummaryCards, type SummaryCardItem } from '@/components/data-display/summary-cards';
import { useQuotationSummary } from '../hooks/use-quotations';

export function QuotationSummaryCards() {
  const summary = useQuotationSummary();

  const items: SummaryCardItem[] = [
    {
      label: 'Total quotations',
      value: summary.total ?? 0,
      icon: FileText,
      caption: 'All time',
      isLoading: summary.isLoading,
    },
    {
      label: 'Draft',
      value: summary.draft ?? 0,
      icon: FileClock,
      caption: 'Not yet sent',
      isLoading: summary.isLoading,
    },
    {
      label: 'Accepted',
      value: summary.accepted ?? 0,
      icon: FileCheck,
      tone: 'success',
      caption: 'Ready for an order',
      isLoading: summary.isLoading,
    },
  ];

  return <SummaryCards items={items} />;
}
