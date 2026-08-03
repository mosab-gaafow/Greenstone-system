import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as purchasesController from './purchases.controller.js';
import {
  createPurchaseBodySchema,
  listPurchasesQuerySchema,
  purchaseIdParamsSchema,
} from './purchases.validators.js';

/**
 * Purchase routes.
 *
 * Per the pre-declared permission map, every role may create and read
 * purchases — there is no role distinction for this module. There is no
 * update or delete route: a purchase, once recorded, is never edited.
 */
export function purchasesRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('purchase', 'read'),
    validate({ query: listPurchasesQuerySchema }),
    purchasesController.list,
  );

  router.get(
    '/:id',
    requirePermission('purchase', 'read'),
    validate({ params: purchaseIdParamsSchema }),
    purchasesController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('purchase', 'create'),
    validate({ body: createPurchaseBodySchema }),
    purchasesController.create,
  );

  return router;
}
