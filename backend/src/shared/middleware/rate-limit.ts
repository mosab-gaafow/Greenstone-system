import type { Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getRateLimitConfig } from '../../config/security.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { buildErrorBody } from '../responses/api-response.js';

/**
 * General API rate limiting.
 *
 * Authentication endpoints get their own stricter limiter in Phase 2, per
 * docs/technical-blueprint.md section 6.3.
 */
export function generalRateLimit(): RequestHandler {
  const { windowMs, max } = getRateLimitConfig();

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res
        .status(429)
        .json(
          buildErrorBody(
            ERROR_CODES.VALIDATION_ERROR,
            'Too many requests. Please wait and try again.',
            (res.locals['requestId'] as string | undefined) ?? String(req.id ?? 'unknown'),
          ),
        );
    },
  });
}
