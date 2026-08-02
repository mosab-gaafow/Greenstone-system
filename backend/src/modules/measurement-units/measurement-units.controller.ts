import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as measurementUnitsService from './measurement-units.service.js';
import type {
  CreateMeasurementUnitInput,
  ListMeasurementUnitsFilters,
  UpdateMeasurementUnitInput,
} from './measurement-units.types.js';

/**
 * HTTP handling for measurement units.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListMeasurementUnitsFilters>(res);
    const result = await measurementUnitsService.listMeasurementUnits(filters);

    sendSuccess(
      res,
      result.measurementUnits,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await measurementUnitsService.getMeasurementUnit(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await measurementUnitsService.createMeasurementUnit(
        req.body as CreateMeasurementUnitInput,
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
      await measurementUnitsService.editMeasurementUnit(
        req.params['id'] as string,
        req.body as UpdateMeasurementUnitInput,
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
      await measurementUnitsService.activateMeasurementUnit(
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
      await measurementUnitsService.deactivateMeasurementUnit(
        req.params['id'] as string,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
