'use client';

import Link from 'next/link';
import { MoreHorizontal, PencilLine, Plus, Power, PowerOff, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { TableToolbar } from '@/components/data-display/table-toolbar';
import { FilterSelect } from '@/components/shared/filter-select';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDate } from '@/lib/format';
import { useEmployees, useSetEmployeeActive } from '../hooks/use-employees';
import { EmployeeStatusTabs } from './employee-status-tabs';
import { SALARY_FREQUENCY_OPTIONS, salaryFrequencyLabel, type Employee } from '../types/employee.types';

const DEFAULTS = { page: '1', search: '', status: 'all', frequency: 'all' } as const;

const FREQUENCY_FILTER = [{ value: 'all', label: 'All frequencies' }, ...SALARY_FREQUENCY_OPTIONS];

const PAGE_SIZE = 25;

export function EmployeeList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [confirming, setConfirming] = useState<Employee | undefined>(undefined);
  const setActive = useSetEmployeeActive();

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useEmployees({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    salaryFrequency: values.frequency === 'all' ? undefined : (values.frequency as 'WEEKLY' | 'MONTHLY'),
    isActive: values.status === 'all' ? undefined : values.status === 'active',
  });

  const columns: ListColumn<Employee>[] = [
    {
      key: 'name',
      header: 'Employee',
      card: 'title',
      render: (employee) => (
        <div className="min-w-0">
          <Link
            href={`/employees/${employee.id}`}
            className="text-primary font-semibold hover:underline"
          >
            {employee.name}
          </Link>
          <p className="text-muted-foreground text-xs">Added {formatDate(employee.createdAt)}</p>
        </div>
      ),
      sortValue: (employee) => employee.name.toLowerCase(),
    },
    { key: 'phone', header: 'Phone', card: 'subtitle', render: (employee) => employee.phone },
    { key: 'jobTitle', header: 'Job title', card: 'meta', render: (employee) => employee.jobTitle },
    {
      key: 'frequency',
      header: 'Frequency',
      card: 'meta',
      render: (employee) => salaryFrequencyLabel(employee.salaryFrequency),
    },
    {
      key: 'salaryAmount',
      header: 'Salary',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (employee) => `KES ${employee.salaryAmount}`,
      sortValue: (employee) => Number(employee.salaryAmount),
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (employee) => <StatusBadge isActive={employee.isActive} />,
      sortValue: (employee) => (employee.isActive ? 1 : 0),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (employee) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${employee.name}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/employees/${employee.id}/edit`} />}>
              <PencilLine className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant={employee.isActive ? 'destructive' : 'default'}
              onClick={() => {
                setConfirming(employee);
              }}
            >
              {employee.isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {employee.isActive ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isFiltered = values.search !== '' || values.status !== 'all' || values.frequency !== 'all';

  return (
    <div className="space-y-4">
      <TableToolbar
        search={values.search}
        onSearchChange={(search) => {
          setFilters({ search });
        }}
        searchPlaceholder="Search by name, phone or job title"
        isFiltered={isFiltered}
        onReset={() => {
          setFilters({ search: '', status: 'all', frequency: 'all' });
        }}
        filters={
          <>
            <EmployeeStatusTabs
              value={values.status}
              onChange={(status) => {
                setFilters({ status });
              }}
            />
            <FilterSelect
              label="Frequency"
              value={values.frequency}
              options={FREQUENCY_FILTER}
              onChange={(frequency) => {
                setFilters({ frequency });
              }}
            />
          </>
        }
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={Users}
          title="The employees could not be loaded"
          description="Check your connection and try again."
          action={
            <Button
              onClick={() => {
                void query.refetch();
              }}
            >
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <ResponsiveList
            records={query.data.employees}
            columns={columns}
            getRowKey={(employee) => employee.id}
            caption="Employees"
            emptyState={
              <EmptyState
                icon={Users}
                title={isFiltered ? 'No employees match those filters' : 'No employees yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Register the people Greenstone employs.'
                }
                action={
                  isFiltered ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ search: '', status: 'all', frequency: 'all' });
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button render={<Link href="/employees/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add employee
                    </Button>
                  )
                }
              />
            }
          />

          <Pagination
            page={query.data.meta.page}
            pageSize={query.data.meta.pageSize}
            totalRecords={query.data.meta.totalRecords}
            totalPages={query.data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={confirming !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(undefined);
          }
        }}
        title={
          confirming?.isActive
            ? `Deactivate ${confirming.name}?`
            : `Activate ${confirming?.name ?? ''}?`
        }
        description={
          confirming?.isActive
            ? 'They will no longer appear as an active employee. Existing records are kept, and you can activate them again at any time.'
            : 'They will be marked as active again.'
        }
        confirmLabel={confirming?.isActive ? 'Deactivate' : 'Activate'}
        destructive={confirming?.isActive ?? false}
        pending={setActive.isPending}
        onConfirm={() => {
          if (confirming) {
            setActive.mutate(
              { id: confirming.id, isActive: !confirming.isActive },
              {
                onSettled: () => {
                  setConfirming(undefined);
                },
              },
            );
          }
        }}
      />
    </div>
  );
}
