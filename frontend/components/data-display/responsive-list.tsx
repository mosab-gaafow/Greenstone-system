'use client';

import type { ReactNode } from 'react';
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
  /** Right-aligns the desktop cell. Used for actions. */
  align?: 'left' | 'right';
  className?: string;
}

interface ResponsiveListProps<TRecord> {
  records: TRecord[];
  columns: ListColumn<TRecord>[];
  getRowKey: (record: TRecord) => string;
  /** Makes the whole row and card open this link. */
  getRowHref?: (record: TRecord) => string;
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
  if (records.length === 0) {
    return <div className="rounded-lg border">{emptyState}</div>;
  }

  const title = columns.find((column) => column.card === 'title');
  const subtitle = columns.find((column) => column.card === 'subtitle');
  const badge = columns.find((column) => column.card === 'badge');
  const meta = columns.filter((column) => column.card === 'meta');
  const actions = columns.filter((column) => column.align === 'right' && column.card !== 'hidden');

  return (
    <>
      {/* Mobile: cards */}
      <ul className="space-y-3 md:hidden">
        {records.map((record) => (
          <li
            key={getRowKey(record)}
            className="bg-card rounded-lg border p-4 shadow-xs"
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
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(column.align === 'right' && 'text-right', column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow
                key={getRowKey(record)}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={
                  onRowClick
                    ? () => {
                        onRowClick(record);
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(column.align === 'right' && 'text-right', column.className)}
                  >
                    {column.render(record)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
