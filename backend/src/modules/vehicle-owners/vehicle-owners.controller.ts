import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as vehicleOwnersService from './vehicle-owners.service.js';
import type {
  CreateVehicleOwnerInput,
  ListVehicleOwnersFilters,
  UpdateVehicleOwnerInput,
} from './vehicle-owners.types.js';

/**
 * HTTP handling for vehicle owners.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListVehicleOwnersFilters>(res);
    const result = await vehicleOwnersService.listVehicleOwners(filters);

    sendSuccess(
      res,
      result.vehicleOwners,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await vehicleOwnersService.getVehicleOwner(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await vehicleOwnersService.createVehicleOwner(
        req.body as CreateVehicleOwnerInput,
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
      await vehicleOwnersService.editVehicleOwner(
        req.params['id'] as string,
        req.body as UpdateVehicleOwnerInput,
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
      await vehicleOwnersService.activateVehicleOwner(
        req.params['id'] as string,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await vehicleOwnersService.deactivateVehicleOwner(
        req.params['id'] as string,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
