import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as ordersController from './orders.controller.js';
import {
  cancelOrderBodySchema,
  createOrderBodySchema,
  listOrdersQuerySchema,
  orderIdParamsSchema,
} from './orders.validators.js';

/**
 * Order routes.
 *
 * Per the pre-declared permission map, super_admin, admin, and accountant may
 * all create, read, update, and cancel orders. There is no generic
 * status-update route and no delete route — see the `Order` model's doc
 * comment in schema.prisma.
 */
export function ordersRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('order', 'read'),
    validate({ query: listOrdersQuerySchema }),
    ordersController.list,
  );

  router.get(
    '/:id/delivery-availability',
    requirePermission('order', 'read'),
    validate({ params: orderIdParamsSchema }),
    ordersController.deliveryAvailability,
  );

  router.get(
    '/:id',
    requirePermission('order', 'read'),
    validate({ params: orderIdParamsSchema }),
    ordersController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('order', 'create'),
    validate({ body: createOrderBodySchema }),
    ordersController.create,
  );

  router.post(
    '/:id/cancel',
    csrfProtection(),
    requirePermission('order', 'cancel'),
    validate({ params: orderIdParamsSchema, body: cancelOrderBodySchema }),
    ordersController.cancel,
  );

  return router;
}
