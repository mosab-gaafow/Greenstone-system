import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as vehiclesService from './vehicles.service.js';
import type { CreateVehicleInput, ListVehiclesFilters, UpdateVehicleInput } from './vehicles.types.js';

/**
 * HTTP handling for vehicles.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListVehiclesFilters>(res);
    const result = await vehiclesService.listVehicles(filters);

    sendSuccess(
      res,
      result.vehicles,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await vehiclesService.getVehicle(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await vehiclesService.createVehicle(req.body as CreateVehicleInput, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await vehiclesService.editVehicle(
        req.params['id'] as string,
        req.body as UpdateVehicleInput,
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
      await vehiclesService.activateVehicle(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await vehiclesService.deactivateVehicle(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}
