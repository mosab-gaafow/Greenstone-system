import type { NextFunction, Request, Response } from 'express';
import { ResourceNotFoundError } from '../errors/app-error.js';

/**
 * Converts unmatched routes into the standard 404 error envelope, so unknown
 * paths never fall through to Express's default HTML page.
 */
export function notFoundHandler() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    next(new ResourceNotFoundError(`Route ${req.method} ${req.path} does not exist.`));
  };
}
