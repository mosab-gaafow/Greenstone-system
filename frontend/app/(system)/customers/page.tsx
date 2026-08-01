'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/page-container';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { CustomerList } from '@/features/customers/components/customer-list';

export default function CustomersPage() {
  return (
    <PageContainer
      title="Customers"
      description="Contractors, developers and homeowners Greenstone supplies."
      action={
        <Button render={<Link href="/customers/new" />} className="h-11 w-full sm:w-auto">
          <Plus className="size-4" aria-hidden />
          Add customer
        </Button>
      }
    >
      {/* useSearchParams needs a Suspense boundary while prerendering. */}
      <Suspense fallback={<ListSkeleton />}>
        <CustomerList />
      </Suspense>
    </PageContainer>
  );
}
