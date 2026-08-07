/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExportData } from './export.types.js';
import type { ExportFormat } from './export.types.js';

const GREEN = 'FF14532D';
const WHITE = 'FFFFFFFF';
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: WHITE }, size: 10 };
const TOTALS_FONT: Partial<ExcelJS.Font> = { bold: true, size: 10 };

// ── Excel ──────────────────────────────────────────────────────────

export async function generateExcel(data: ExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Greenstone Management System';
  const ws = wb.addWorksheet(data.title.slice(0, 31)); // sheet name max 31 chars

  const cols = data.columns;
  if (cols.length === 0) return Buffer.from('');

  // Title row
  let rowIdx = 1;
  if (data.title) {
    ws.mergeCells(1, 1, 1, cols.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = data.title;
    titleCell.font = { bold: true, size: 14, color: { argb: GREEN } };
    rowIdx = 2;

    if (data.subtitle) {
      ws.mergeCells(2, 1, 2, cols.length);
      const subCell = ws.getCell(2, 1);
      subCell.value = data.subtitle;
      subCell.font = { size: 10, color: { argb: 'FF64748B' } };
      rowIdx = 3;
    }
    rowIdx++; // blank row after title
  }

  // Header row
  const headerRow = ws.getRow(rowIdx);
  for (let i = 0; i < cols.length; i++) {
    const cell = headerRow.getCell(i + 1);
    cell.value = cols[i]!.header;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: cols[i]!.align ?? 'left', vertical: 'middle' };
  }
  headerRow.height = 22;
  rowIdx++;

  // Data rows
  for (const row of data.rows) {
    const r = ws.getRow(rowIdx);
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!;
      const raw = (row as any)[col.key];
      const cell = r.getCell(i + 1);
      cell.value = formatCellValue(raw, col.format);
      cell.alignment = { horizontal: col.align ?? 'left', vertical: 'middle' };
      if (col.format === 'KES' || col.format === 'int' || col.format === 'decimal') {
        cell.numFmt = col.format === 'KES' ? '#,##0.00' : col.format === 'int' ? '#,##0' : '#,##0.00';
      }
    }
    r.height = 18;
    rowIdx++;
  }

  // Totals row
  if (data.totals && cols.length > 0) {
    const totalsRow = ws.getRow(rowIdx);
    totalsRow.font = TOTALS_FONT;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!;
      const cell = totalsRow.getCell(i + 1);
      const val = data.totals[col.key];
      if (val !== undefined) {
        cell.value = formatCellValue(val, col.format);
        cell.alignment = { horizontal: col.align ?? 'left', vertical: 'middle' };
        if (col.format === 'KES') cell.numFmt = '#,##0.00';
        else if (col.format === 'int') cell.numFmt = '#,##0';
      }
    }
    // top border on totals
    for (let i = 0; i < cols.length; i++) {
      totalsRow.getCell(i + 1).border = { top: { style: 'thin' } };
    }
  }

  // Column widths
  for (let i = 0; i < cols.length; i++) {
    ws.getColumn(i + 1).width = cols[i]!.width ?? 14;
  }

  // Freeze header row
  ws.views = [{ state: 'frozen', ySplit: data.title ? (data.subtitle ? 4 : 3) : 1 }];

  // Auto-filter on header row
  const headerRowNum = data.title ? (data.subtitle ? 3 : 2) : 1;
  ws.autoFilter = { from: { row: headerRowNum, column: 1 }, to: { row: headerRowNum, column: cols.length } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── CSV ────────────────────────────────────────────────────────────

export function generateCsv(data: ExportData): string {
  const cols = data.columns;
  if (cols.length === 0) return '';

  const lines: string[] = [];

  // BOM for Excel compatibility
  const BOM = '﻿';

  // Title
  if (data.title) {
    lines.push(`"${data.title}"`);
    if (data.subtitle) lines.push(`"${data.subtitle}"`);
    lines.push('');
  }

  // Headers
  lines.push(cols.map(c => csvEscape(c.header)).join(','));

  // Data
  for (const row of data.rows) {
    lines.push(cols.map(c => csvEscape(formatCsvValue((row as any)[c.key], c.format))).join(','));
  }

  // Totals
  if (data.totals) {
    lines.push(cols.map(c => {
      const val = data.totals![c.key];
      return val !== undefined ? csvEscape(formatCsvValue(val, c.format)) : '';
    }).join(','));
  }

  return BOM + lines.join('\n');
}

// ── PDF HTML ───────────────────────────────────────────────────────

let _logoSvg: string | null | undefined;
let _logoDataUri: string | null | undefined;

function loadLogo(): string {
  if (_logoDataUri !== undefined) return _logoDataUri ?? '';
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const logoPath = resolve(__dirname, '..', '..', '..', '..', 'frontend', 'public', 'brand', 'greenstone-logo-horizontal-green.svg');
    const svg = readFileSync(logoPath, 'utf-8');
    _logoSvg = svg;
    _logoDataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return _logoDataUri;
  } catch {
    _logoDataUri = null;
    return '';
  }
}

export function generatePdfHtml(data: ExportData): string {
  const logo = loadLogo();
  const cols = data.columns;
  const now = new Date().toISOString().split('T')[0];

  const headerCells = cols.map(c => `<th>${esc(c.header)}</th>`).join('');
  const bodyRows = data.rows.map((row, i) => {
    const cells = cols.map(c => {
      const raw = (row as any)[c.key];
      const cls = (c.align === 'right' || c.format === 'KES' || c.format === 'int') ? ' class="num"' : '';
      return `<td${cls}>${esc(formatCsvValue(raw, c.format))}</td>`;
    }).join('');
    return `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`;
  }).join('');

  let totalsRow = '';
  if (data.totals) {
    const totalCells = cols.map(c => {
      const val = data.totals![c.key];
      const cls = (c.align === 'right' || c.format === 'KES' || c.format === 'int') ? ' class="num"' : '';
      return `<td${cls}>${val !== undefined ? esc(formatCsvValue(val, c.format)) : ''}</td>`;
    }).join('');
    totalsRow = `<tr class="totals">${totalCells}</tr>`;
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(data.title)}</title>
<style>
  @page { margin: 12mm 14mm; size: A4 landscape; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: 8pt; color: #1e293b; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 3px solid #14532D; }
  .header img { height: 28px; }
  .header h1 { font-size: 14pt; color: #14532D; }
  .meta { font-size: 7pt; color: #64748b; margin-bottom: 6px; }
  .summary { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
  .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; }
  .summary-card .label { font-size: 6pt; color: #64748b; text-transform: uppercase; }
  .summary-card .value { font-size: 9pt; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  thead th { background: #14532D; color: #fff; padding: 5px 6px; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; text-align: left; }
  tbody td { padding: 3px 6px; border-bottom: 1px solid #e2e8f0; font-size: 7.5pt; }
  tr.even { background: #f8fafc; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.totals { font-weight: 700; border-top: 2px solid #14532D; }
  tr.totals td { padding-top: 4px; }
  .footer { margin-top: 10px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 6pt; color: #94a3b8; display: flex; justify-content: space-between; }
</style></head><body>
<div class="header">${logo ? `<img src="${logo}" alt="Greenstone">` : '<h1>Greenstone</h1>'}<h1>${esc(data.title)}</h1></div>
<div class="meta">${data.subtitle ? esc(data.subtitle) + ' &middot; ' : ''}Generated ${now}</div>
${data.totals ? renderPdfSummary(data.totals) : ''}
<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}${totalsRow}</tbody></table>
<div class="footer"><span>Greenstone Management System</span><span>Page 1 of 1</span></div>
</body></html>`;
}

function renderPdfSummary(totals: Record<string, string | number>): string {
  const entries = Object.entries(totals).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  const cards = entries.slice(0, 6).map(([k, v]) =>
    `<div class="summary-card"><div class="label">${esc(k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()))}</div><div class="value">${esc(String(v))}</div></div>`,
  ).join('');
  return `<div class="summary">${cards}</div>`;
}

// ── Helpers ────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (s == null) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function csvEscape(v: string | null | undefined): string {
  const s = v ?? '';
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatCellValue(raw: unknown, format?: string): string | number | null {
  if (raw === null || raw === undefined) return '';
  if (format === 'KES') return Number(raw);
  if (format === 'int') return Number(raw);
  if (format === 'decimal') return Number(raw);
  if (format === 'date' && typeof raw === 'string') {
    try {
      const d = new Date(raw);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return String(raw); }
  }
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  return String(raw);
}

function formatCsvValue(raw: unknown, format?: string): string {
  if (raw === null || raw === undefined) return '';
  if (format === 'KES') return Number(raw).toFixed(2);
  if (format === 'date' && typeof raw === 'string') {
    try { return new Date(raw).toISOString().split('T')[0]!; } catch { return String(raw); }
  }
  return String(raw);
}

/** Maps a format string to content type. */
export function contentType(fmt: ExportFormat): string {
  if (fmt === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (fmt === 'csv') return 'text/csv; charset=utf-8';
  if (fmt === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

/** Maps a format string to a filename-safe extension. */
export function fileExt(fmt: ExportFormat): string {
  return fmt === 'xlsx' ? '.xlsx' : fmt === 'csv' ? '.csv' : '.pdf';
}
