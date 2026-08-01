import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { PermissionDeniedError } from '../errors/app-error.js';
import { auth } from './auth.js';
import { getRequestContext } from './session.middleware.js';
import type { GreenstoneRole, statement } from './permissions.js';

/**
 * Role permission checks.
 *
 * Backend permission checks are mandatory. Hiding an action in the frontend is
 * not security.
 */

type Statement = typeof statement;
export type Resource = keyof Statement;
export type ActionOf<R extends Resource> = Statement[R][number];

/**
 * Requires the caller's role to permit `action` on `resource`.
 *
 * Must be used after `requireAuth()`.
 */
export function requirePermission<R extends Resource>(
  resource: R,
  action: ActionOf<R>,
): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      try {
        const context = getRequestContext(res);

        const allowed = await hasPermission(context.user.role, resource, action);

        if (!allowed) {
          next(new PermissionDeniedError());
          return;
        }

        next();
      } catch (error) {
        next(error);
      }
    })();
  };
}

/**
 * Checks a role against the access-control map.
 *
 * Exposed for services that must make the same decision outside a route, and
 * for tests.
 */
export async function hasPermission<R extends Resource>(
  role: GreenstoneRole,
  resource: R,
  action: ActionOf<R>,
): Promise<boolean> {
  // The generated body type is a Zod intersection that TypeScript cannot narrow
  // from a computed key, so the argument is asserted at this single boundary.
  // `resource` and `action` are already constrained by the statement type above.
  const request = {
    body: { role, permissions: { [resource]: [action] } },
  } as unknown as Parameters<typeof auth.api.userHasPermission>[0];

  const result = await auth.api.userHasPermission(request);

  return result.success === true;
}
