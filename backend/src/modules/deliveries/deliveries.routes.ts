import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as deliveriesController from './deliveries.controller.js';
import {
  cancelDeliveryBodySchema,
  completeDeliveryBodySchema,
  correctDeliveryBodySchema,
  createDeliveryBodySchema,
  listDeliveriesQuerySchema,
  deliveryIdParamsSchema,
  setTransportBodySchema,
} from './deliveries.validators.js';

/**
 * Delivery routes (Phase 8A/8B).
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

  router.patch(
    '/:id/transport',
    csrfProtection(),
    requirePermission('delivery', 'create'),
    validate({ params: deliveryIdParamsSchema, body: setTransportBodySchema }),
    deliveriesController.setTransport,
  );

  router.post(
    '/:id/dispatch',
    csrfProtection(),
    requirePermission('delivery', 'dispatch'),
    validate({ params: deliveryIdParamsSchema }),
    deliveriesController.dispatch,
  );

  router.post(
    '/:id/complete',
    csrfProtection(),
    requirePermission('delivery', 'complete'),
    validate({ params: deliveryIdParamsSchema, body: completeDeliveryBodySchema }),
    deliveriesController.complete,
  );

  router.post(
    '/:id/cancel',
    csrfProtection(),
    requirePermission('delivery', 'cancel'),
    validate({ params: deliveryIdParamsSchema, body: cancelDeliveryBodySchema }),
    deliveriesController.cancel,
  );

  router.post(
    '/:id/correct',
    csrfProtection(),
    requirePermission('delivery', 'correct'),
    validate({ params: deliveryIdParamsSchema, body: correctDeliveryBodySchema }),
    deliveriesController.correct,
  );

  return router;
}
