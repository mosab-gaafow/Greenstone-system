import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import {
  buildPaginationMeta,
  sendCreated,
  sendSuccess,
} from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as customersService from './customers.service.js';
import type {
  CreateAddressInput,
  CreateCustomerInput,
  ListCustomersFilters,
  UpdateAddressInput,
  UpdateCustomerInput,
} from './customers.types.js';

/**
 * HTTP handling for customers and their addresses.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListCustomersFilters>(res);
    const result = await customersService.listCustomers(filters);

    sendSuccess(
      res,
      result.customers,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await customersService.getCustomer(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendCreated(
      res,
      await customersService.createCustomer(
        req.body as CreateCustomerInput,
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
      await customersService.editCustomer(
        req.params['id'] as string,
        req.body as UpdateCustomerInput,
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
      await customersService.activateCustomer(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await customersService.deactivateCustomer(req.params['id'] as string, getRequestContext(res)),
    );
  } catch (error) {
    next(error);
  }
}

export async function createAddress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendCreated(
      res,
      await customersService.addAddress(
        req.params['id'] as string,
        req.body as CreateAddressInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function updateAddress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendSuccess(
      res,
      await customersService.editAddress(
        req.params['id'] as string,
        req.params['addressId'] as string,
        req.body as UpdateAddressInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function activateAddress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendSuccess(
      res,
      await customersService.setAddressActiveState(
        req.params['id'] as string,
        req.params['addressId'] as string,
        true,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function deactivateAddress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendSuccess(
      res,
      await customersService.setAddressActiveState(
        req.params['id'] as string,
        req.params['addressId'] as string,
        false,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
