import { Router } from 'express';
import { requireAuth } from '../auth/session.middleware.js';
import { validate } from '../validation/validate.js';
import * as ctrl from './export.controller.js';
import { exportQuerySchema } from './export.validators.js';

/**
 * Single export gateway.
 *
 * Permission: exports reuse the same permission as the source report or list page.
 * The controller validates data access through existing module services, which
 * perform their own permission checks internally.
 */
export function exportRoutes(): Router {
  const r = Router();
  r.use(requireAuth());

  // Catch-all: /api/v1/export/orders?format=xlsx, /api/v1/export/reports/orders?format=pdf, etc.
  // The *splat captures multi-segment paths like "reports/orders".
  r.get('/*splat', validate({ query: exportQuerySchema }), ctrl.exportData);

  return r;
}
