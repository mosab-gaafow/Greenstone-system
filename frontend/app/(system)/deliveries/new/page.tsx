'use client';

import { ArrowLeft, Truck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { DeliveryForm } from '@/features/deliveries/components/delivery-form';

export default function NewDeliveryPage() {
  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/deliveries" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to deliveries
      </Button>

      <PageHeader
        icon={Truck}
        title="Plan delivery"
        description="Select an order, driver, vehicle, and the items to deliver."
      />

      <DeliveryForm />
    </div>
  );
}
