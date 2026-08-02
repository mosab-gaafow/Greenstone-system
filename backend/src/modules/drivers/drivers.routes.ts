import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as driversController from './drivers.controller.js';
import {
  createDriverBodySchema,
  driverIdParamsSchema,
  listDriversQuerySchema,
  updateDriverBodySchema,
} from './drivers.validators.js';

/**
 * Driver routes.
 *
 * Per docs/permissions-matrix.md, the Accountant has full create/read/update
 * access, same as Admin and Super Admin.
 */
export function driversRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('driver', 'read'),
    validate({ query: listDriversQuerySchema }),
    driversController.list,
  );

  router.get(
    '/:id',
    requirePermission('driver', 'read'),
    validate({ params: driverIdParamsSchema }),
    driversController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('driver', 'create'),
    validate({ body: createDriverBodySchema }),
    driversController.create,
  );

  router.patch(
    '/:id',
    csrfProtection(),
    requirePermission('driver', 'update'),
    validate({ params: driverIdParamsSchema, body: updateDriverBodySchema }),
    driversController.update,
  );

  router.post(
    '/:id/activate',
    csrfProtection(),
    requirePermission('driver', 'update'),
    validate({ params: driverIdParamsSchema }),
    driversController.activate,
  );

  router.post(
    '/:id/deactivate',
    csrfProtection(),
    requirePermission('driver', 'update'),
    validate({ params: driverIdParamsSchema }),
    driversController.deactivate,
  );

  return router;
}
