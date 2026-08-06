import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as invoicesService from './invoices.service.js';
import type { CreateInvoiceInput, ListInvoicesFilters, VoidInvoiceInput } from './invoices.types.js';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListInvoicesFilters>(res);
    const result = await invoicesService.listInvoices(filters);
    sendSuccess(res, result.invoices, buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await invoicesService.getInvoiceWithFinance(req.params['id'] as string)); } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendCreated(res, await invoicesService.createInvoice(req.body as CreateInvoiceInput, getRequestContext(res))); } catch (e) { next(e); }
}

export async function voidInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await invoicesService.voidInvoiceAction(req.params['id'] as string, req.body as VoidInvoiceInput, getRequestContext(res))); } catch (e) { next(e); }
}

export async function downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pdf = await invoicesService.downloadInvoicePdf(req.params['id'] as string, getRequestContext(res));
    res.setHeader('Content-Type', pdf.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(pdf.fileName)}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(pdf.content);
  } catch (e) { next(e); }
}
