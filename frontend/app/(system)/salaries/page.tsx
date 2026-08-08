'use client';
import Link from 'next/link';
import { HandCoins, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListExportButton } from '@/components/shared/list-export-button';
import { SalaryList } from '@/features/salaries/components/salary-list';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canRegisterSalary } from '@/lib/permissions';

export default function SalariesPage() {
  const { user } = useCurrentUser();

  return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
    <PageHeader
      icon={HandCoins}
      title="Salaries"
      description="Employee salary records."
      secondaryActions={<><ListExportButton source="salaries" fileName="Salaries" /></>}
      action={canRegisterSalary(user) ? (
        <Button render={<Link href="/salaries/new" />} className="h-11"><Plus className="size-4" />Register salary</Button>
      ) : undefined}
    />
    <SalaryList />
  </div>;
}
