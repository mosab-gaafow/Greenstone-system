'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/data-display/empty-state';
import { EmployeeFormDialog } from '@/features/employees/components/employee-form-dialog';
import { useEmployee, useUpdateEmployee } from '@/features/employees/hooks/use-employees';

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const query = useEmployee(id);
  const updateEmployee = useUpdateEmployee(id);

  function close() {
    router.push(`/employees/${id}`);
  }

  if (query.isPending) {
    return (
      <PageContainer title="Edit employee">
        <div className="max-w-xl space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (query.isError) {
    return (
      <PageContainer title="Edit employee">
        <EmptyState
          icon={Users}
          title="This employee could not be loaded"
          description="They may have been removed, or the link may be wrong."
        />
      </PageContainer>
    );
  }

  return (
    <EmployeeFormDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      employee={query.data}
      pending={updateEmployee.isPending}
      onSubmit={async (values) => {
        await updateEmployee.mutateAsync(values);
        close();
      }}
    />
  );
}
