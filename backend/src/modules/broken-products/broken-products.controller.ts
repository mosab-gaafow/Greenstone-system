import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as brokenProductsService from './broken-products.service.js';
import type {
  CreateBrokenProductRecordInput,
  ListBrokenProductRecordsFilters,
} from './broken-products.types.js';

/**
 * HTTP handling for broken products.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListBrokenProductRecordsFilters>(res);
    const result = await brokenProductsService.listBrokenProductRecords(filters);

    sendSuccess(
      res,
      result.records,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await brokenProductsService.createBrokenProductRecord(
        req.body as CreateBrokenProductRecordInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
