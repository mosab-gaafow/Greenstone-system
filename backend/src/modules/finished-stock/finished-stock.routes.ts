import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as finishedStockController from './finished-stock.controller.js';
import {
  adjustStockBodySchema,
  listMovementsQuerySchema,
  productIdParamsSchema,
  setOpeningStockBodySchema,
} from './finished-stock.validators.js';

/**
 * Finished stock routes.
 *
 * Mounted under the same `/products` base path as the products module —
 * these are product sub-resources, guarded by the separate `finished-stock`
 * permission resource rather than `product`.
 */
export function finishedStockRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  // Must be before /:id/finished-stock so Express matches this literal first
  router.get(
    '/finished-stock',
    requirePermission('finished-stock', 'read'),
    finishedStockController.listAll,
  );

  router.get(
    '/:id/finished-stock',
    requirePermission('finished-stock', 'read'),
    validate({ params: productIdParamsSchema }),
    finishedStockController.getStock,
  );

  router.get(
    '/:id/finished-stock/movements',
    requirePermission('finished-stock', 'read'),
    validate({ params: productIdParamsSchema, query: listMovementsQuerySchema }),
    finishedStockController.listMovements,
  );

  router.post(
    '/:id/finished-stock/opening',
    csrfProtection(),
    requirePermission('finished-stock', 'set-opening'),
    validate({ params: productIdParamsSchema, body: setOpeningStockBodySchema }),
    finishedStockController.setOpeningStock,
  );

  router.post(
    '/:id/finished-stock/adjust',
    csrfProtection(),
    requirePermission('finished-stock', 'adjust'),
    validate({ params: productIdParamsSchema, body: adjustStockBodySchema }),
    finishedStockController.adjustStock,
  );

  return router;
}
