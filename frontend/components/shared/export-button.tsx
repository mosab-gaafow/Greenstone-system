'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { API_BASE_URL } from '@/lib/config';

interface ExportButtonProps {
  /** Export source, e.g. "reports/orders" or "orders" */
  source: string;
  /** Active filter query params to forward */
  params: Record<string, string | undefined>;
  /** Base filename without extension */
  fileName: string;
  /** Optional: rows + columns for Print (fetched by caller or from API) */
  printData?: { rows: Record<string, unknown>[]; columns: { key: string; header: string }[]; title: string; subtitle?: string };
}

export function ExportButton({ source, params, fileName, printData }: ExportButtonProps) {
  const [loading, setLoading] = useState<string | null>(null);

  function buildUrl(format: string): string {
    const url = new URL(`${API_BASE_URL}/export/${source}`, window.location.origin);
    url.searchParams.set('format', format);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
    return url.toString();
  }

  function downloadFile(format: string) {
    setLoading(format);
    const a = document.createElement('a');
    a.href = buildUrl(format);
    a.download = `${fileName}.${format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setLoading(null), 1000);
  }

  function handlePrint() {
    if (!printData?.rows || printData.rows.length === 0) {
      // If no pre-fetched data, open the PDF version for printing
      window.open(buildUrl('pdf'), '_blank');
      return;
    }
    // Open print-optimized view
    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) return;
    const html = buildPrintHtml(printData);
    w.document.write(html);
    w.document.close();
    w.onload = () => { setTimeout(() => w.print(), 500); };
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm" className="gap-2 h-9" disabled={loading !== null} type="button">
          <Download className="size-3.5" />
          {loading ? `Exporting ${loading.toUpperCase()}…` : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => downloadFile('xlsx')}>
          <FileSpreadsheet className="size-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadFile('csv')}>
          <FileText className="size-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadFile('pdf')}>
          <FileText className="size-4" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="size-4" /> Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildPrintHtml(data: { rows: Record<string, unknown>[]; columns: { key: string; header: string }[]; title: string; subtitle?: string }): string {
  const esc = (s: string) => s?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') ?? '';
  const cols = data.columns;
  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(data.title)}</title>
<style>
  @media print { body { -webkit-print-color-adjust: exact; } @page { margin: 12mm 14mm; size: A4 landscape; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #1e293b; padding: 20px; }
  h1 { font-size: 16pt; color: #14532D; margin-bottom: 4px; }
  .meta { font-size: 8pt; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #14532D; color: #fff; padding: 6px 8px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; text-align: left; }
  tbody td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; font-size: 8pt; }
  tr:nth-child(even) { background: #f8fafc; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .footer { margin-top: 16px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 7pt; color: #94a3b8; }
</style></head><body>
<h1>${esc(data.title)}</h1>
<div class="meta">${data.subtitle ? esc(data.subtitle) + ' &middot; ' : ''}Generated ${now}</div>
<table><thead><tr>${cols.map(c => `<th>${esc(c.header)}</th>`).join('')}</tr></thead>
<tbody>${data.rows.map((r, i) =>
  `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">${cols.map(c => {
    const v = (r as any)[c.key];
    const cls = /^(total|amount|paid|outstanding|cost|price|quantity|count|balance|KES)/i.test(c.key) ? 'num' : '';
    const display = v === null || v === undefined ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v);
    return `<td class="${cls}">${esc(display)}</td>`;
  }).join('')}</tr>`
).join('')}
</tbody></table>
<div class="footer">Greenstone Management System &middot; ${now}</div>
</body></html>`;
}
