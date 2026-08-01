import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { healthRoutes } from './health/health.routes.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { notFoundHandler } from './shared/middleware/not-found.js';
import { generalRateLimit } from './shared/middleware/rate-limit.js';
import { requestId } from './shared/middleware/request-id.js';
import { requestLogger } from './shared/middleware/request-logger.js';
import { corsMiddleware, securityHeaders } from './shared/middleware/security.js';

export const API_BASE_PATH = '/api/v1';

/**
 * Creates the Express application.
 *
 * Order matters. Request identity and logging come first so every later failure
 * is traceable; the error handler comes last so everything funnels through it.
 *
 * Authentication, CSRF enforcement on business routes and the module routers are
 * added in Phase 2 onward. CSRF middleware exists in
 * `shared/middleware/csrf.ts` and is mounted with the first state-changing
 * routes, since Phase 1 has none.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Required for correct client IPs and secure cookies behind Nginx.
  app.set('trust proxy', 1);

  app.use(requestId());
  app.use(requestLogger());

  app.use(securityHeaders());
  app.use(corsMiddleware());

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  app.use(generalRateLimit());

  app.use(`${API_BASE_PATH}/health`, healthRoutes());

  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}
