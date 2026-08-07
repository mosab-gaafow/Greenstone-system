'use client';

import { FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/config';

interface Props {
  source: string;
  params: Record<string, string | undefined>;
  fileName: string;
}

export function ReportExportBar({ source, params, fileName }: Props) {
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
    window.open(new URL(`${API_BASE_URL}/export/${source}?format=pdf&${new URLSearchParams(
      Object.entries(params).filter(([, v]) => v).map(([k, v]) => [k, String(v)])
    ).toString()}`, window.location.origin).toString(), '_blank');
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground mr-1 uppercase tracking-wider">Export:</span>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2.5" onClick={() => download('csv')}><FileText className="size-3" />CSV</Button>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2.5" onClick={() => download('xlsx')}><FileSpreadsheet className="size-3" />XLSX</Button>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2.5" onClick={() => download('pdf')}><FileText className="size-3" />PDF</Button>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2.5" onClick={handlePrint}><Printer className="size-3" />Print</Button>
    </div>
  );
}
