'use client';

import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ItemRowListProps {
  /** `useFieldArray`'s `fields` — each needs a stable `id`. */
  rows: { id: string }[];
  renderRow: (index: number) => ReactNode;
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel?: string;
  /** Below this count, the remove button is hidden. A form always keeps at least one row. */
  minRows?: number;
}

/**
 * Repeatable line-item rows for a multi-item form (orders, production).
 * Each row is mobile-first: one column, stacked, with the remove action
 * reachable by touch.
 */
export function ItemRowList({
  rows,
  renderRow,
  onAdd,
  onRemove,
  addLabel = 'Add item',
  minRows = 1,
}: ItemRowListProps) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <Card key={row.id} className="relative">
          <CardContent className="space-y-3 pt-4 pr-10">
            {renderRow(index)}
            {rows.length > minRows && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive absolute top-2 right-2"
                aria-label={`Remove item ${String(index + 1)}`}
                onClick={() => {
                  onRemove(index);
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={onAdd} className="h-11 w-full sm:w-auto">
        <Plus className="size-4" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}
