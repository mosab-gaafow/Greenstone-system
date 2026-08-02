'use client';

import { useRouter } from 'next/navigation';
import { EmployeeFormDialog } from '@/features/employees/components/employee-form-dialog';
import { useCreateEmployee } from '@/features/employees/hooks/use-employees';

export default function NewEmployeePage() {
  const router = useRouter();
  const createEmployee = useCreateEmployee();

  return (
    <EmployeeFormDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.push('/employees');
        }
      }}
      pending={createEmployee.isPending}
      onSubmit={async (values) => {
        const employee = await createEmployee.mutateAsync(values);
        router.push(`/employees/${employee.id}`);
      }}
    />
  );
}
