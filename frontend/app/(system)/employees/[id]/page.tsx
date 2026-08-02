'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, PencilLine, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { useEmployee } from '@/features/employees/hooks/use-employees';
import { paymentMethodLabel, salaryFrequencyLabel } from '@/features/employees/types/employee.types';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useEmployee(id);

  if (query.isPending) {
    return (
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon={Users}
          title="This employee could not be loaded"
          description="They may have been removed, or the link may be wrong."
          action={
            <Button variant="outline" render={<Link href="/employees" />}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to employees
            </Button>
          }
        />
      </div>
    );
  }

  const employee = query.data;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/employees" />}
        className="text-muted-foreground -ml-2 h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to employees
      </Button>

      <PageHeader
        icon={Users}
        title={employee.name}
        badge={<StatusBadge isActive={employee.isActive} />}
        description={employee.jobTitle}
        action={
          <Button
            render={<Link href={`/employees/${employee.id}/edit`} />}
            className="h-11 w-full sm:w-auto"
          >
            <PencilLine className="size-4" aria-hidden />
            Edit
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardContent className="space-y-4">
          <DetailRow label="Phone">{employee.phone}</DetailRow>
          <DetailRow label="National ID">
            {employee.nationalId ?? <span className="text-muted-foreground">Not provided</span>}
          </DetailRow>
          <DetailRow label="Job title">{employee.jobTitle}</DetailRow>
          <DetailRow label="Salary frequency">{salaryFrequencyLabel(employee.salaryFrequency)}</DetailRow>
          <DetailRow label="Salary amount">KES {employee.salaryAmount}</DetailRow>
          <DetailRow label="Payment method">{paymentMethodLabel(employee.paymentMethod)}</DetailRow>
        </CardContent>
      </Card>
    </div>
  );
}
