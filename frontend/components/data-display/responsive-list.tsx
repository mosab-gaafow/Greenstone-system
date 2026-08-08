'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * One list, two presentations.
 *
 * Desktop gets a table; phones get cards. This is a single component rather
 * than two, so a screen cannot accidentally ship one and forget the other, and
 * so no wide table ever forces horizontal scrolling on a phone.
 *
 * The desktop table is built on TanStack Table so a column can sort. Sorting
 * only reorders the page of records already on screen — the backend list
 * endpoints do not accept a sort parameter yet, so this is an honest, useful
 * client-side sort rather than a claim of server-side ordering.
 *
 * The caller describes each column once. `card` decides how the column appears
 * on a phone:
 *
 * - `title`     the heading of the card
 * - `subtitle`  directly under the title
 * - `meta`      a labelled line in the card body
 * - `badge`     top-right of the card
 * - `hidden`    desktop only
 */
export interface ListColumn<TRecord> {
  key: string;
  header: string;
  render: (record: TRecord) => ReactNode;
  card?: 'title' | 'subtitle' | 'meta' | 'badge' | 'hidden';
  /** Right-aligns the desktop cell. Used for actions and numbers. */
  align?: 'left' | 'right';
  className?: string;
  /** Enables sorting the current page by this column. */
  sortValue?: (record: TRecord) => string | number;
}

interface ColumnMeta {
  align?: 'left' | 'right';
  className?: string;
}

interface ResponsiveListProps<TRecord> {
  records: TRecord[];
  columns: ListColumn<TRecord>[];
  getRowKey: (record: TRecord) => string;
  onRowClick?: (record: TRecord) => void;
  emptyState: ReactNode;
  caption?: string;
}

export function ResponsiveList<TRecord>({
  records,
  columns,
  getRowKey,
  onRowClick,
  emptyState,
  caption,
}: ResponsiveListProps<TRecord>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const tableColumns = useMemo<ColumnDef<TRecord, unknown>[]>(
    () =>
      columns.map((column) => ({
        id: column.key,
        header: column.header,
        accessorFn: column.sortValue ?? (() => ''),
        enableSorting: Boolean(column.sortValue),
        cell: ({ row }) => column.render(row.original),
        meta: { align: column.align, className: column.className } satisfies ColumnMeta,
      })),
    [columns],
  );

  const table = useReactTable({
    data: records,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (records.length === 0) {
    return <div className="rounded-xl border">{emptyState}</div>;
  }

  const title = columns.find((column) => column.card === 'title');
  const subtitle = columns.find((column) => column.card === 'subtitle');
  const badge = columns.find((column) => column.card === 'badge');
  const meta = columns.filter((column) => column.card === 'meta');
  const actions = columns.filter(
    (column) => column.align === 'right' && column.card === undefined,
  );

  return (
    <>
      {/* Mobile: cards */}
      <ul className="space-y-3 md:hidden">
        {records.map((record) => (
          <li
            key={getRowKey(record)}
            className="bg-card rounded-xl border p-4 shadow-xs dark:shadow-none"
            onClick={
              onRowClick
                ? () => {
                    onRowClick(record);
                  }
                : undefined
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                {title && <div className="truncate font-medium">{title.render(record)}</div>}
                {subtitle && (
                  <div className="text-muted-foreground truncate text-sm">
                    {subtitle.render(record)}
                  </div>
                )}
              </div>
              {badge && <div className="shrink-0">{badge.render(record)}</div>}
            </div>

            {meta.length > 0 && (
              <dl className="mt-3 space-y-1.5 text-sm">
                {meta.map((column) => (
                  <div key={column.key} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{column.header}</dt>
                    <dd className="min-w-0 truncate text-right">{column.render(record)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {actions.length > 0 && (
              <div className="mt-3 flex justify-end border-t pt-3">
                {actions.map((column) => (
                  <div key={column.key}>{column.render(record)}</div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const columnMeta = header.column.columnDef.meta as ColumnMeta | undefined;
                  const canSort = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        columnMeta?.align === 'right' && 'text-right',
                        columnMeta?.className,
                      )}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            'group/sort text-foreground hover:text-foreground inline-flex items-center gap-1',
                            columnMeta?.align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDirection === 'asc' ? (
                            <ArrowUp className="text-primary size-3.5" aria-hidden />
                          ) : sortDirection === 'desc' ? (
                            <ArrowDown className="text-primary size-3.5" aria-hidden />
                          ) : (
                            <ArrowUpDown
                              className="size-3.5 opacity-0 transition-opacity group-hover/sort:opacity-40"
                              aria-hidden
                            />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={
                  onRowClick
                    ? () => {
                        onRowClick(row.original);
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => {
                  const columnMeta = cell.column.columnDef.meta as ColumnMeta | undefined;

                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(columnMeta?.align === 'right' && 'text-right', columnMeta?.className)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
