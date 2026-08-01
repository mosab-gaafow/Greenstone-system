import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { auth } from './auth.js';
import { toAuthHeaders, type AuthenticatedUser, type RequestContext } from './auth-context.js';
import { AuthenticationRequiredError, PermissionDeniedError } from '../errors/app-error.js';
import { isGreenstoneRole } from './permissions.js';

/**
 * Session authentication.
 *
 * Resolves the Better Auth session for a request. Sessions are database-backed,
 * so a revoked or expired session fails here immediately — there is no window in
 * which a stale credential still works.
 */

/** Key under which the request context is stored on `res.locals`. */
const CONTEXT_KEY = 'requestContext';

export function requireAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      try {
        const session = await auth.api.getSession({ headers: toAuthHeaders(req) });

        if (!session) {
          next(new AuthenticationRequiredError());
          return;
        }

        const { user } = session;

        // A banned user should never reach here, because the Admin plugin
        // rejects session creation for them and banning revokes sessions. This
        // is a second line of defence, not the primary one.
        if (user.banned === true) {
          next(new PermissionDeniedError('This account is deactivated.'));
          return;
        }

        if (!isGreenstoneRole(user.role)) {
          // A user with an unknown role must not fall through to a default.
          next(new PermissionDeniedError('This account has no valid role assigned.'));
          return;
        }

        const authenticatedUser: AuthenticatedUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          banned: false,
        };

        const context: RequestContext = {
          user: authenticatedUser,
          headers: toAuthHeaders(req),
          requestId: (res.locals['requestId'] as string | undefined) ?? String(req.id ?? 'unknown'),
          ipAddress: req.ip ?? null,
          userAgent: req.get('user-agent') ?? null,
        };

        res.locals[CONTEXT_KEY] = context;
        next();
      } catch (error) {
        next(error);
      }
    })();
  };
}

/**
 * Reads the context established by {@link requireAuth}.
 *
 * Throws rather than returning undefined, because reaching a handler without a
 * context means the route is missing `requireAuth` — a routing bug, not a
 * runtime condition to tolerate.
 */
export function getRequestContext(res: Response): RequestContext {
  const context = res.locals[CONTEXT_KEY] as RequestContext | undefined;

  if (!context) {
    throw new Error('Request context is missing. Add requireAuth() to this route.');
  }

  return context;
}
