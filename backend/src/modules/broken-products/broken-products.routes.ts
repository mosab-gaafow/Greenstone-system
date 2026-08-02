import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as brokenProductsController from './broken-products.controller.js';
import {
  createBrokenProductRecordBodySchema,
  listBrokenProductRecordsQuerySchema,
} from './broken-products.validators.js';

/**
 * Broken product routes.
 *
 * No update or delete route — broken-product records are append-only, per
 * the pre-declared permission map (`create`/`read` only).
 */
export function brokenProductsRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('broken-product', 'read'),
    validate({ query: listBrokenProductRecordsQuerySchema }),
    brokenProductsController.list,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('broken-product', 'create'),
    validate({ body: createBrokenProductRecordBodySchema }),
    brokenProductsController.create,
  );

  return router;
}
