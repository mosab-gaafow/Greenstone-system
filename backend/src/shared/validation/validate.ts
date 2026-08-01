import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';
import { ValidationError } from '../errors/app-error.js';
import { toFieldErrors } from '../middleware/error-handler.js';

/**
 * Zod validation middleware.
 *
 * Backend validation is mandatory and never trusts the frontend.
 * See docs/technical-blueprint.md section 11.1.
 */

export interface ValidationSchemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

/**
 * Validates the request against the supplied schemas.
 *
 * Parsed values replace the raw ones so handlers receive typed, coerced data and
 * unknown fields are stripped by the schema.
 *
 * `req.query` is a getter in Express 5, so the parsed result is stored in
 * `res.locals.query` rather than reassigned.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }

      if (schemas.query) {
        res.locals['query'] = schemas.query.parse(req.query);
      }

      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('The submitted information is not valid.', toFieldErrors(error)));
        return;
      }

      next(error);
    }
  };
}

/**
 * Reads query values parsed by {@link validate}.
 */
export function getValidatedQuery<TQuery>(res: Response): TQuery {
  return res.locals['query'] as TQuery;
}
