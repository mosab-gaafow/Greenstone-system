import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as deliveriesService from './deliveries.service.js';
import type { CreateDeliveryInput, ListDeliveriesFilters } from './deliveries.types.js';

/**
 * HTTP handling for deliveries (Phase 8A).
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListDeliveriesFilters>(res);
    const result = await deliveriesService.listDeliveries(filters);

    sendSuccess(
      res,
      result.deliveries,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await deliveriesService.getDelivery(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await deliveriesService.createDelivery(
        req.body as CreateDeliveryInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
