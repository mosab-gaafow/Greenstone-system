import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as productionService from './production.service.js';
import type { CreateProductionInput, ListProductionFilters } from './production.types.js';

/**
 * HTTP handling for production.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListProductionFilters>(res);
    const result = await productionService.listProduction(filters);

    sendSuccess(
      res,
      result.batches,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await productionService.getProduction(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await productionService.createProduction(
        req.body as CreateProductionInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
