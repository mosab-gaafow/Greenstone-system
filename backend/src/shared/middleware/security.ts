import cors from 'cors';
import type { RequestHandler } from 'express';
import helmet from 'helmet';
import { getCorsConfig } from '../../config/security.js';

/**
 * Security response headers.
 *
 * This is a JSON API that serves no HTML, so the content-security-policy is
 * restrictive and cross-origin resource embedding is disabled.
 */
export function securityHeaders(): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
  });
}

/**
 * CORS for the single approved frontend origin, with credentials enabled so the
 * authentication cookies are sent.
 */
export function corsMiddleware(): RequestHandler {
  return cors(getCorsConfig());
}
