'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { API_BASE_URL } from '@/lib/config';

interface Props {
  source: string;
  fileName: string;
}

/** Export button for system list pages. Reads active filters from URL params. */
export function ListExportButton({ source, fileName }: Props) {
  function download(format: string) {
    const url = new URL(`${API_BASE_URL}/export/${source}`, window.location.origin);
    url.searchParams.set('format', format);
    // Forward all current URL search params as filters
    const currentParams = new URLSearchParams(window.location.search);
    for (const [k, v] of currentParams.entries()) {
      if (v && !['format'].includes(k)) url.searchParams.set(k, v);
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
    const url = new URL(`${API_BASE_URL}/export/${source}`, window.location.origin);
    url.searchParams.set('format', 'pdf');
    const currentParams = new URLSearchParams(window.location.search);
    for (const [k, v] of currentParams.entries()) {
      if (v && !['format'].includes(k)) url.searchParams.set(k, v);
    }
    window.open(url.toString(), '_blank');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Download className="size-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => download('csv')}>CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => download('xlsx')}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => download('pdf')}>PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>Print</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
