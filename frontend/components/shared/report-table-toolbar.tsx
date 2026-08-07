'use client';

import type { ReactNode } from 'react';
import { FileSpreadsheet, FileText, Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/lib/config';

interface Props {
  source: string;
  params: Record<string, string | undefined>;
  fileName: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  rowCount?: number;
  children?: ReactNode;
}

export function ReportTableToolbar({
  source, params, fileName,
  searchValue, onSearchChange, searchPlaceholder = 'Search…',
  rowCount, children,
}: Props) {
  function download(format: string) {
    const url = new URL(`${API_BASE_URL}/export/${source}`, window.location.origin);
    url.searchParams.set('format', format);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
    const ext = format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
    const a = document.createElement('a');
    a.href = url.toString();
    a.download = `${fileName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handlePrint() {
    const qs = new URLSearchParams();
    qs.set('format', 'pdf');
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    window.open(`${API_BASE_URL}/export/${source}?${qs.toString()}`, '_blank');
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      {/* Export buttons */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground mr-1">Export:</span>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => download('csv')}><FileText className="size-3" />CSV</Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => download('xlsx')}><FileSpreadsheet className="size-3" />XLSX</Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => download('pdf')}><FileText className="size-3" />PDF</Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={handlePrint}><Printer className="size-3" />Print</Button>
      </div>

      {/* Custom content slot */}
      {children}

      {/* Search */}
      {onSearchChange && (
        <div className="relative sm:ml-auto sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-8 h-7 text-xs"
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {/* Row count */}
      {rowCount !== undefined && (
        <span className="text-[10px] text-muted-foreground tabular-nums">{rowCount} row{rowCount !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}
