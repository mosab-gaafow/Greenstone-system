import type { RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';
import { getLogger } from '../utils/logger.js';

/**
 * Request logging.
 *
 * Logs method, path, status, duration, request id and user id when available.
 * Secret redaction is configured on the logger itself.
 *
 * See docs/technical-blueprint.md section 11.5.
 */
export function requestLogger(): RequestHandler {
  return pinoHttp({
    logger: getLogger(),
    genReqId: (req) => req.id as string,
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) {
        return 'error';
      }
      if (res.statusCode >= 400) {
        return 'warn';
      }
      return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  });
}
