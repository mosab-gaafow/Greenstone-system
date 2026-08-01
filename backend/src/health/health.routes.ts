import { Router } from 'express';
import { liveness, readiness } from './health.controller.js';

/**
 * Health routes.
 *
 * Mounted under `/api/v1` so the production Nginx layout, which proxies only
 * `/api/v1` to Express, can reach them.
 */
export function healthRoutes(): Router {
  const router = Router();

  router.get('/live', liveness);
  router.get('/ready', readiness);

  return router;
}
