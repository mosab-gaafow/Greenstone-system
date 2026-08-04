'use client';

import { use } from 'react';
import { DeliveryDetailView } from '@/features/deliveries/components/delivery-detail';

export default function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DeliveryDetailView id={id} />;
}
