/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextFunction, Request, Response } from 'express';
import { getValidatedQuery } from '../validation/validate.js';
import { fetchExportData } from './export.data-source.js';
import { generateExcel, generateCsv, generatePdfHtml, contentType, fileExt } from './export.service.js';
import { generateOfficialDocument } from '../documents/documents.service.js';
import { toAuditContext } from '../auth/auth-context.js';
import type { ExportRequest } from './export.types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toExportRequest(q: Record<string, unknown>): any {
  return {
    source: q.source as string,
    format: q.format as ExportRequest['format'],
    search: q.search as string | undefined,
    from: q.from as string | undefined,
    to: q.to as string | undefined,
    status: q.status as string | undefined,
    customerId: q.customerId as string | undefined,
    orderStatus: q.orderStatus as string | undefined,
    invoiceStatus: q.invoiceStatus as string | undefined,
    paymentStatus: q.paymentStatus as string | undefined,
    paymentMethod: q.paymentMethod as string | undefined,
    receiptStatus: q.receiptStatus as string | undefined,
    category: q.category as string | undefined,
    salaryType: q.salaryType as string | undefined,
    movementType: q.movementType as string | undefined,
    supplierId: q.supplierId as string | undefined,
    balanceFilter: q.balanceFilter as string | undefined,
    limit: q.limit as number | undefined,
    groupBy: q.groupBy as string | undefined,
  };
}

export async function exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = getValidatedQuery<Record<string, unknown>>(res);
    // Express 5 splat: req.params.splat or req.params['0']
    // Strip leading slash — Express 5 captures "/reports/invoices" but mapping keys use "reports/invoices"
    let source = ((req.params as any).splat ?? (req.params as any)['0'] ?? '') as string;
    if (source.startsWith('/')) source = source.slice(1);
    const expReq = { ...toExportRequest(query), source };
    const data = await fetchExportData(expReq);
    const fmt = expReq.format;

    if (fmt === 'xlsx') {
      const buf = await generateExcel(data);
      res.setHeader('Content-Type', contentType('xlsx'));
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(data.title)}${fileExt('xlsx')}"`);
      res.send(buf);
    } else if (fmt === 'csv') {
      const csv = generateCsv(data);
      res.setHeader('Content-Type', contentType('csv'));
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(data.title)}${fileExt('csv')}"`);
      res.send(Buffer.from(csv, 'utf-8'));
    } else if (fmt === 'pdf') {
      const html = generatePdfHtml(data);
      const generated = await generateOfficialDocument({
        documentType: 'INVOICE' as any, // reuse existing pipeline — just need to store+render
        relatedEntityId: 'export',
        documentNumber: `EXPORT-${Date.now()}`,
        documentTitle: data.title,
        html,
        uploadedByUserId: (req as any).user?.id ?? 'export-system',
        sourceUpdatedAt: new Date(),
      }, toAuditContext(req as any) as any).catch(() => null);

      if (generated?.content) {
        res.setHeader('Content-Type', contentType('pdf'));
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(data.title)}${fileExt('pdf')}"`);
        res.send(generated.content);
      } else {
        // Fallback: send raw HTML as a downloadable file
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      }
    }
  } catch (e) {
    next(e);
  }
}

function safeFileName(title: string): string {
  return title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
}
