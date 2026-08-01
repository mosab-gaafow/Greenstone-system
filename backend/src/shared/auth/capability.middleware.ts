import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { PermissionDeniedError } from '../errors/app-error.js';
import type { Capability } from '../../generated/prisma/client.js';
import { hasCapability } from './capability.service.js';
import { getRequestContext } from './session.middleware.js';
import { ADMIN_ROLES } from './permissions.js';

/**
 * Capability check for approved per-user permissions.
 *
 * Must run after `requireAuth()` and after the role check. A capability widens
 * what an Accountant may do; it never replaces the role check.
 *
 * Admin and Super Admin already hold these abilities through their role, so they
 * do not need a grant.
 */
export function requireCapability(capability: Capability): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      try {
        const context = getRequestContext(res);

        if (ADMIN_ROLES.includes(context.user.role)) {
          next();
          return;
        }

        if (!(await hasCapability(context.user.id, capability))) {
          next(new PermissionDeniedError('You have not been authorised to perform this action.'));
          return;
        }

        next();
      } catch (error) {
        next(error);
      }
    })();
  };
}
