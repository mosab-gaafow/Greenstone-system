import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as finishedStockService from './finished-stock.service.js';
import type {
  AdjustFinishedStockInput,
  ListFinishedStockMovementsFilters,
  SetOpeningFinishedStockInput,
} from './finished-stock.types.js';

/**
 * HTTP handling for finished stock.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function listAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, (await finishedStockService.listAllStock()).rows);
  } catch (error) {
    next(error);
  }
}

export async function getStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await finishedStockService.getStock(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListFinishedStockMovementsFilters>(res);
    const result = await finishedStockService.listMovements(req.params['id'] as string, filters);

    sendSuccess(
      res,
      result.movements,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function setOpeningStock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendSuccess(
      res,
      await finishedStockService.setOpeningStock(
        req.params['id'] as string,
        req.body as SetOpeningFinishedStockInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await finishedStockService.adjustStock(
        req.params['id'] as string,
        req.body as AdjustFinishedStockInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
