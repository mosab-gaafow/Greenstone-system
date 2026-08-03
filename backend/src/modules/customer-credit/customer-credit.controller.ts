import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import { sendSuccess } from '../../shared/responses/api-response.js';
import * as customerCreditService from './customer-credit.service.js';
import type { GetCreditProjectionQuery, SetOpeningBalanceInput } from './customer-credit.types.js';

/**
 * HTTP handling for customer credit.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function getCreditStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendSuccess(res, await customerCreditService.getCreditStatus(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function getCreditProjection(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { newOrderTotal } = getValidatedQuery<GetCreditProjectionQuery>(res);
    sendSuccess(
      res,
      await customerCreditService.getCreditProjection(req.params['id'] as string, newOrderTotal),
    );
  } catch (error) {
    next(error);
  }
}

export async function setOpeningBalance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    sendSuccess(
      res,
      await customerCreditService.setOpeningBalance(
        req.params['id'] as string,
        req.body as SetOpeningBalanceInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
