'use client';

import { ShoppingCart, Banknote, CreditCard } from 'lucide-react';
import { SummaryCards, type SummaryCardItem } from '@/components/data-display/summary-cards';
import { useOrderSummary } from '../hooks/use-orders';

export function OrderSummaryCards() {
  const summary = useOrderSummary();

  const items: SummaryCardItem[] = [
    {
      label: 'Total orders',
      value: summary.total ?? 0,
      icon: ShoppingCart,
      caption: 'All time',
      isLoading: summary.isLoading,
    },
    {
      label: 'Prepaid',
      value: summary.prepaid ?? 0,
      icon: Banknote,
      tone: 'success',
      caption: 'Paid before dispatch',
      isLoading: summary.isLoading,
    },
    {
      label: 'Credit',
      value: summary.credit ?? 0,
      icon: CreditCard,
      caption: 'Subject to credit checks',
      isLoading: summary.isLoading,
    },
  ];

  return <SummaryCards items={items} />;
}
