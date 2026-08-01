import { Router } from 'express';
import { getCsrfUtilities } from './csrf.js';
import { sendSuccess } from '../responses/api-response.js';

/**
 * CSRF token endpoint.
 *
 * Greenstone business routes use double-submit CSRF protection, so a client
 * needs a way to obtain the token before its first state-changing request. The
 * call sets the paired cookie and returns the token to send in the
 * `X-CSRF-Token` header.
 *
 * This is a safe method and requires no CSRF token itself.
 */
export function csrfRoutes(): Router {
  const router = Router();

  router.get('/', (req, res) => {
    sendSuccess(res, { csrfToken: getCsrfUtilities().issueCsrfToken(req, res) });
  });

  return router;
}
