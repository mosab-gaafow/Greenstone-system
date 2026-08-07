'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListExportButton } from '@/components/shared/list-export-button';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { EmployeeSummaryCards } from '@/features/employees/components/employee-summary-cards';
import { EmployeeList } from '@/features/employees/components/employee-list';
import { employeeKeys } from '@/features/employees/hooks/use-employees';

export default function EmployeesPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Users}
        title="Employees"
        description="The people Greenstone employs, weekly and monthly."
        secondaryActions={<><ListExportButton source="employees" fileName="Employees" /><Button variant="outline" className="h-11" onClick={() => { void queryClient.invalidateQueries({ queryKey: employeeKeys.all }); }}><RefreshCw className="size-4" aria-hidden />Refresh</Button></>}
        action={<Button render={<Link href="/employees/new" />} className="h-11 w-full sm:w-auto"><Plus className="size-4" aria-hidden />Add employee</Button>}
      />
      <EmployeeSummaryCards />
      <Suspense fallback={<ListSkeleton />}>
        <EmployeeList />
      </Suspense>
    </div>
  );
}
