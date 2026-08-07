'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  onClear?: () => void;
}

/** Bordered filter area matching the source.png reference. */
export function ReportFilterPanel({ children, onClear }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
      {children}
      {onClear && (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={onClear}>
          <X className="size-3" /> Clear
        </Button>
      )}
    </div>
  );
}
