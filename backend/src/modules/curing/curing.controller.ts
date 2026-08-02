import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as curingService from './curing.service.js';
import type { ChangeCuringDurationInput, ListCuringFilters, ReleaseCuringInput } from './curing.types.js';

/**
 * HTTP handling for curing.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListCuringFilters>(res);
    const result = await curingService.listCuring(filters);

    sendSuccess(
      res,
      result.records,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await curingService.getCuring(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function changeDuration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendSuccess(
      res,
      await curingService.changeDuration(
        req.params['id'] as string,
        req.body as ChangeCuringDurationInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function release(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await curingService.release(
        req.params['id'] as string,
        req.body as ReleaseCuringInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
