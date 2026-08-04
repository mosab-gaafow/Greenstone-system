import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as deliveriesController from './deliveries.controller.js';
import {
  createDeliveryBodySchema,
  listDeliveriesQuerySchema,
  deliveryIdParamsSchema,
} from './deliveries.validators.js';

/**
 * Delivery routes (Phase 8A).
 *
 * PLANNED deliveries only — no dispatch, completion, cancellation, or
 * correction endpoints (those are 8C/8D/8E/8F).
 */
export function deliveriesRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('delivery', 'read'),
    validate({ query: listDeliveriesQuerySchema }),
    deliveriesController.list,
  );

  router.get(
    '/:id',
    requirePermission('delivery', 'read'),
    validate({ params: deliveryIdParamsSchema }),
    deliveriesController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('delivery', 'create'),
    validate({ body: createDeliveryBodySchema }),
    deliveriesController.create,
  );

  return router;
}
