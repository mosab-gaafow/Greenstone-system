import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as employeesService from './employees.service.js';
import type { CreateEmployeeInput, ListEmployeesFilters, UpdateEmployeeInput } from './employees.types.js';

/**
 * HTTP handling for employees.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListEmployeesFilters>(res);
    const result = await employeesService.listEmployees(filters);

    sendSuccess(
      res,
      result.employees,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await employeesService.getEmployee(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await employeesService.createEmployee(req.body as CreateEmployeeInput, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await employeesService.editEmployee(
        req.params['id'] as string,
        req.body as UpdateEmployeeInput,
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
      await employeesService.activateEmployee(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await employeesService.deactivateEmployee(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}
