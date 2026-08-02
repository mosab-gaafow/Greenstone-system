'use client';

import { useState } from 'react';
import { MoreHorizontal, PencilLine, Plus, Power, PowerOff, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { StatusBadge } from '@/components/data-display/status-badge';
import { StatusTabs } from '@/components/shared/status-tabs';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { TableToolbar } from '@/components/data-display/table-toolbar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useUrlFilters } from '@/hooks/use-url-filters';
import {
  useCreateMeasurementUnit,
  useMeasurementUnits,
  useSetMeasurementUnitActive,
  useUpdateMeasurementUnit,
} from '../hooks/use-measurement-units';
import { MeasurementUnitDialog } from './measurement-unit-dialog';
import type { MeasurementUnit } from '../types/measurement-unit.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;

const PAGE_SIZE = 25;

export function MeasurementUnitList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [dialogUnit, setDialogUnit] = useState<MeasurementUnit | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState<MeasurementUnit | undefined>(undefined);

  const setActive = useSetMeasurementUnitActive();
  const createUnit = useCreateMeasurementUnit();
  const updateUnit = useUpdateMeasurementUnit(dialogUnit?.id ?? '');

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useMeasurementUnits({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    isActive: values.status === 'all' ? undefined : values.status === 'active',
  });

  const columns: ListColumn<MeasurementUnit>[] = [
    {
      key: 'name',
      header: 'Unit',
      card: 'title',
      render: (unit) => <span className="font-semibold">{unit.name}</span>,
      sortValue: (unit) => unit.name.toLowerCase(),
    },
    { key: 'symbol', header: 'Symbol', card: 'subtitle', render: (unit) => unit.symbol ?? '—' },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (unit) => <StatusBadge isActive={unit.isActive} />,
      sortValue: (unit) => (unit.isActive ? 1 : 0),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (unit) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${unit.name}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setDialogUnit(unit);
                setDialogOpen(true);
              }}
            >
              <PencilLine className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant={unit.isActive ? 'destructive' : 'default'}
              onClick={() => {
                setConfirming(unit);
              }}
            >
              {unit.isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {unit.isActive ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isFiltered = values.search !== '' || values.status !== 'all';

  return (
    <div className="space-y-4">
      <TableToolbar
        search={values.search}
        onSearchChange={(search) => {
          setFilters({ search });
        }}
        searchPlaceholder="Search by name"
        isFiltered={isFiltered}
        onReset={() => {
          setFilters({ search: '', status: 'all' });
        }}
        filters={
          <StatusTabs
            value={values.status}
            onChange={(status) => {
              setFilters({ status });
            }}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        }
      />

      <div className="flex justify-end">
        <Button
          onClick={() => {
            setDialogUnit(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add unit
        </Button>
      </div>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={Ruler}
          title="The measurement units could not be loaded"
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
            records={query.data.measurementUnits}
            columns={columns}
            getRowKey={(unit) => unit.id}
            caption="Measurement units"
            emptyState={
              <EmptyState
                icon={Ruler}
                title={isFiltered ? 'No units match those filters' : 'No measurement units yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Add the units raw materials are measured in.'
                }
                action={
                  isFiltered ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ search: '', status: 'all' });
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setDialogUnit(undefined);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="size-4" aria-hidden />
                      Add unit
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

      <MeasurementUnitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        unit={dialogUnit}
        pending={createUnit.isPending || updateUnit.isPending}
        onSubmit={async (values) => {
          if (dialogUnit) {
            await updateUnit.mutateAsync(values);
          } else {
            await createUnit.mutateAsync(values);
          }
          setDialogOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirming !== undefined}
        onOpenChange={(open) => {
          if (!open) setConfirming(undefined);
        }}
        title={
          confirming?.isActive ? `Deactivate ${confirming.name}?` : `Activate ${confirming?.name ?? ''}?`
        }
        description={
          confirming?.isActive
            ? 'It will no longer be selectable for new raw materials. Existing records are kept.'
            : 'It will become selectable again for new raw materials.'
        }
        confirmLabel={confirming?.isActive ? 'Deactivate' : 'Activate'}
        destructive={confirming?.isActive ?? false}
        pending={setActive.isPending}
        onConfirm={() => {
          if (confirming) {
            setActive.mutate(
              { id: confirming.id, isActive: !confirming.isActive },
              { onSettled: () => setConfirming(undefined) },
            );
          }
        }}
      />
    </div>
  );
}
