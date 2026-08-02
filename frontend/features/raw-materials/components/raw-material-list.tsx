'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FlaskConical, MoreHorizontal, PencilLine, Plus, Power, PowerOff } from 'lucide-react';
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
  useCreateRawMaterial,
  useRawMaterials,
  useSetRawMaterialActive,
  useUpdateRawMaterial,
} from '../hooks/use-raw-materials';
import { RawMaterialDialog } from './raw-material-dialog';
import type { RawMaterial } from '../types/raw-material.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;

const PAGE_SIZE = 25;

export function RawMaterialList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [dialogMaterial, setDialogMaterial] = useState<RawMaterial | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState<RawMaterial | undefined>(undefined);

  const setActive = useSetRawMaterialActive();
  const createMaterial = useCreateRawMaterial();
  const updateMaterial = useUpdateRawMaterial(dialogMaterial?.id ?? '');

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useRawMaterials({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    isActive: values.status === 'all' ? undefined : values.status === 'active',
  });

  const columns: ListColumn<RawMaterial>[] = [
    {
      key: 'name',
      header: 'Raw material',
      card: 'title',
      render: (material) => (
        <Link href={`/raw-materials/${material.id}`} className="text-primary font-semibold hover:underline">
          {material.name}
        </Link>
      ),
      sortValue: (material) => material.name.toLowerCase(),
    },
    {
      key: 'unit',
      header: 'Unit',
      card: 'subtitle',
      render: (material) =>
        material.measurementUnitSymbol
          ? `${material.measurementUnitName} (${material.measurementUnitSymbol})`
          : material.measurementUnitName,
    },
    {
      key: 'reorderLevel',
      header: 'Reorder level',
      card: 'meta',
      align: 'right',
      className: 'tabular-nums',
      render: (material) => material.reorderLevel ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (material) => <StatusBadge isActive={material.isActive} />,
      sortValue: (material) => (material.isActive ? 1 : 0),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (material) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Actions for ${material.name}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/raw-materials/${material.id}`} />}>
              <FlaskConical className="size-4" aria-hidden />
              View stock
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setDialogMaterial(material);
                setDialogOpen(true);
              }}
            >
              <PencilLine className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant={material.isActive ? 'destructive' : 'default'}
              onClick={() => {
                setConfirming(material);
              }}
            >
              {material.isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {material.isActive ? 'Deactivate' : 'Activate'}
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
            setDialogMaterial(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add raw material
        </Button>
      </div>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={FlaskConical}
          title="The raw materials could not be loaded"
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
            records={query.data.rawMaterials}
            columns={columns}
            getRowKey={(material) => material.id}
            caption="Raw materials"
            emptyState={
              <EmptyState
                icon={FlaskConical}
                title={isFiltered ? 'No raw materials match those filters' : 'No raw materials yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Add cement, dust, pumice, or another configured material.'
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
                        setDialogMaterial(undefined);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="size-4" aria-hidden />
                      Add raw material
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

      <RawMaterialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rawMaterial={dialogMaterial}
        pending={createMaterial.isPending || updateMaterial.isPending}
        onSubmit={async (values) => {
          if (dialogMaterial) {
            await updateMaterial.mutateAsync(values);
          } else {
            await createMaterial.mutateAsync(values);
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
          confirming?.isActive
            ? `Deactivate ${confirming.name}?`
            : `Activate ${confirming?.name ?? ''}?`
        }
        description={
          confirming?.isActive
            ? 'It will no longer be selectable for new production. Existing records are kept.'
            : 'It will become selectable again for new production.'
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
