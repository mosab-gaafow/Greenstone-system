import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as suppliersService from './suppliers.service.js';
import type { CreateSupplierInput, ListSuppliersFilters, UpdateSupplierInput } from './suppliers.types.js';

/**
 * HTTP handling for suppliers.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListSuppliersFilters>(res);
    const result = await suppliersService.listSuppliers(filters);

    sendSuccess(
      res,
      result.suppliers,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await suppliersService.getSupplier(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await suppliersService.createSupplier(req.body as CreateSupplierInput, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await suppliersService.editSupplier(
        req.params['id'] as string,
        req.body as UpdateSupplierInput,
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
      await suppliersService.activateSupplier(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await suppliersService.deactivateSupplier(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}
