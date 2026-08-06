import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as receiptsService from './receipts.service.js';
import type { ListReceiptsFilters } from './receipts.types.js';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListReceiptsFilters>(res);
    const result = await receiptsService.listReceipts(filters);
    sendSuccess(res, result.receipts, buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await receiptsService.getReceipt(req.params['id'] as string));
  } catch (e) { next(e); }
}

export async function downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pdf = await receiptsService.downloadReceiptPdf(req.params['id'] as string, getRequestContext(res));
    res.setHeader('Content-Type', pdf.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(pdf.fileName)}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(pdf.content);
  } catch (e) { next(e); }
}
