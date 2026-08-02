import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as ordersService from './orders.service.js';
import type { CancelOrderInput, CreateOrderInput, ListOrdersFilters } from './orders.types.js';

/**
 * HTTP handling for orders.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListOrdersFilters>(res);
    const result = await ordersService.listOrders(filters);

    sendSuccess(
      res,
      result.orders,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await ordersService.getOrder(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await ordersService.createOrder(req.body as CreateOrderInput, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await ordersService.cancelOrder(
        req.params['id'] as string,
        req.body as CancelOrderInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
