import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as suppliersController from './suppliers.controller.js';
import {
  createSupplierBodySchema,
  listSuppliersQuerySchema,
  supplierIdParamsSchema,
  updateSupplierBodySchema,
} from './suppliers.validators.js';

/**
 * Supplier routes.
 *
 * Per the pre-declared permission map, super_admin, admin, and accountant may
 * all create, read, and update suppliers.
 */
export function suppliersRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('supplier', 'read'),
    validate({ query: listSuppliersQuerySchema }),
    suppliersController.list,
  );

  router.get(
    '/:id',
    requirePermission('supplier', 'read'),
    validate({ params: supplierIdParamsSchema }),
    suppliersController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('supplier', 'create'),
    validate({ body: createSupplierBodySchema }),
    suppliersController.create,
  );

  router.patch(
    '/:id',
    csrfProtection(),
    requirePermission('supplier', 'update'),
    validate({ params: supplierIdParamsSchema, body: updateSupplierBodySchema }),
    suppliersController.update,
  );

  router.post(
    '/:id/activate',
    csrfProtection(),
    requirePermission('supplier', 'update'),
    validate({ params: supplierIdParamsSchema }),
    suppliersController.activate,
  );

  router.post(
    '/:id/deactivate',
    csrfProtection(),
    requirePermission('supplier', 'update'),
    validate({ params: supplierIdParamsSchema }),
    suppliersController.deactivate,
  );

  return router;
}
