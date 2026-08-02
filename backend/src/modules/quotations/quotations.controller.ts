import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as quotationsService from './quotations.service.js';
import type {
  CreateQuotationInput,
  ListQuotationsFilters,
  QuotationStatusChangeInput,
  UpdateQuotationInput,
} from './quotations.types.js';

/**
 * HTTP handling for quotations.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListQuotationsFilters>(res);
    const result = await quotationsService.listQuotations(filters);

    sendSuccess(
      res,
      result.quotations,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await quotationsService.getQuotation(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await quotationsService.createQuotation(
        req.body as CreateQuotationInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await quotationsService.editQuotation(
        req.params['id'] as string,
        req.body as UpdateQuotationInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function accept(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await quotationsService.acceptQuotation(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await quotationsService.rejectQuotation(
        req.params['id'] as string,
        req.body as QuotationStatusChangeInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await quotationsService.cancelQuotation(
        req.params['id'] as string,
        req.body as QuotationStatusChangeInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = await quotationsService.downloadQuotationPdf(
      req.params['id'] as string,
      getRequestContext(res),
    );

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
    res.send(file.content);
  } catch (error) {
    next(error);
  }
}
