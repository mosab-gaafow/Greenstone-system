import type { Request, RequestHandler, Response } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import { getEnv } from '../../config/env.js';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, getBaseCookieOptions } from '../../config/security.js';
import { AppError } from '../errors/app-error.js';
import { ERROR_CODES } from '../errors/error-codes.js';

/**
 * CSRF protection foundation.
 *
 * Authentication uses cookies, so every state-changing request must also carry a
 * CSRF token that an attacker's site cannot read. This is the double-submit
 * pattern: a token in a cookie must match the one sent in the request header.
 *
 * Phase 1 wires the mechanism. Phase 2 binds `getSessionIdentifier` to the real
 * authenticated session, per docs/technical-blueprint.md section 6.4.
 */

export class CsrfValidationError extends AppError {
  constructor() {
    super(ERROR_CODES.PERMISSION_DENIED, 403, 'Invalid or missing CSRF token.');
  }
}

interface CsrfUtilities {
  csrfProtection: RequestHandler;
  issueCsrfToken: (req: Request, res: Response) => string;
}

let cached: CsrfUtilities | undefined;

export function getCsrfUtilities(): CsrfUtilities {
  if (!cached) {
    const env = getEnv();
    const baseCookie = getBaseCookieOptions();

    const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
      getSecret: () => env.CSRF_SECRET,
      // Binds the token to the caller's Better Auth session cookie, so one
      // signed-in user's token is not valid for another. Falls back to the IP
      // for unauthenticated requests, which have no session to bind to.
      getSessionIdentifier: (req: Request) => getSessionIdentifier(req),
      cookieName: CSRF_COOKIE_NAME,
      cookieOptions: {
        ...baseCookie,
        // Readable by the frontend so it can echo the token back in the header.
        httpOnly: false,
      },
      getCsrfTokenFromRequest: (req: Request) => req.get(CSRF_HEADER_NAME),
      ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    });

    cached = {
      csrfProtection: (req, res, next) => {
        doubleCsrfProtection(req, res, (error?: unknown) => {
          // Convert the library's http-errors instance into the standard
          // application error so the global handler emits the approved envelope.
          next(error ? new CsrfValidationError() : undefined);
        });
      },
      issueCsrfToken: (req, res) => generateCsrfToken(req, res),
    };
  }

  return cached;
}

/** Clears the cached utilities. Test-only. */
export function resetCsrfCache(): void {
  cached = undefined;
}

export function csrfProtection(): RequestHandler {
  return (req, res, next) => {
    getCsrfUtilities().csrfProtection(req, res, next);
  };
}

/**
 * Identifies the caller for CSRF token binding.
 *
 * Better Auth's session cookie is read directly rather than through a session
 * lookup, because this runs on every mutation and only needs a stable value to
 * bind the token to, not a verified identity. Authentication itself is enforced
 * separately by `requireAuth()`.
 */
function getSessionIdentifier(req: Request): string {
  const cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    const match = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/.exec(cookieHeader);

    if (match?.[1]) {
      return match[1];
    }
  }

  return req.ip ?? 'anonymous';
}
