import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as productsController from './products.controller.js';
import {
  createProductBodySchema,
  listProductsQuerySchema,
  productIdParamsSchema,
  updateProductBodySchema,
} from './products.validators.js';

/**
 * Product routes.
 *
 * Attaches authentication, permission, CSRF and validation middleware, then
 * calls a controller. No business logic here.
 *
 * Per docs/permissions-matrix.md the Accountant may read products but not
 * change them, which `requirePermission` enforces.
 */
export function productsRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('product', 'read'),
    validate({ query: listProductsQuerySchema }),
    productsController.list,
  );

  router.get(
    '/:id',
    requirePermission('product', 'read'),
    validate({ params: productIdParamsSchema }),
    productsController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('product', 'create'),
    validate({ body: createProductBodySchema }),
    productsController.create,
  );

  router.patch(
    '/:id',
    csrfProtection(),
    requirePermission('product', 'update'),
    validate({ params: productIdParamsSchema, body: updateProductBodySchema }),
    productsController.update,
  );

  router.post(
    '/:id/activate',
    csrfProtection(),
    requirePermission('product', 'update'),
    validate({ params: productIdParamsSchema }),
    productsController.activate,
  );

  router.post(
    '/:id/deactivate',
    csrfProtection(),
    requirePermission('product', 'update'),
    validate({ params: productIdParamsSchema }),
    productsController.deactivate,
  );

  return router;
}
