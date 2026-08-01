import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import {
  buildPaginationMeta,
  sendCreated,
  sendSuccess,
} from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as productsService from './products.service.js';
import type {
  CreateProductInput,
  ListProductsFilters,
  UpdateProductInput,
} from './products.types.js';

/**
 * HTTP handling for products.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 * Never touches Prisma, the repository, or the cache.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListProductsFilters>(res);
    const result = await productsService.listProducts(filters);

    sendSuccess(
      res,
      result.products,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await productsService.getProduct(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await productsService.createProduct(req.body as CreateProductInput, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await productsService.editProduct(
        req.params['id'] as string,
        req.body as UpdateProductInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function activate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await productsService.activateProduct(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await productsService.deactivateProduct(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}
