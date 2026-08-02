import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as rawMaterialsService from './raw-materials.service.js';
import type {
  AdjustRawMaterialStockInput,
  CreateRawMaterialInput,
  ListRawMaterialMovementsFilters,
  ListRawMaterialsFilters,
  SetOpeningRawMaterialStockInput,
  UpdateRawMaterialInput,
} from './raw-materials.types.js';

/**
 * HTTP handling for raw materials.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListRawMaterialsFilters>(res);
    const result = await rawMaterialsService.listRawMaterials(filters);

    sendSuccess(
      res,
      result.rawMaterials,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await rawMaterialsService.getRawMaterial(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await rawMaterialsService.createRawMaterial(
        req.body as CreateRawMaterialInput,
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
      await rawMaterialsService.editRawMaterial(
        req.params['id'] as string,
        req.body as UpdateRawMaterialInput,
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
      await rawMaterialsService.activateRawMaterial(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await rawMaterialsService.deactivateRawMaterial(
        req.params['id'] as string,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function getStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await rawMaterialsService.getStock(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListRawMaterialMovementsFilters>(res);
    const result = await rawMaterialsService.listMovements(req.params['id'] as string, filters);

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
      await rawMaterialsService.setOpeningStock(
        req.params['id'] as string,
        req.body as SetOpeningRawMaterialStockInput,
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
      await rawMaterialsService.adjustStock(
        req.params['id'] as string,
        req.body as AdjustRawMaterialStockInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
