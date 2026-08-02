import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as vehiclesController from './vehicles.controller.js';
import {
  createVehicleBodySchema,
  listVehiclesQuerySchema,
  updateVehicleBodySchema,
  vehicleIdParamsSchema,
} from './vehicles.validators.js';

/**
 * Vehicle routes.
 *
 * Per docs/permissions-matrix.md, the Accountant has full create/read/update
 * access, same as Admin and Super Admin.
 */
export function vehiclesRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('vehicle', 'read'),
    validate({ query: listVehiclesQuerySchema }),
    vehiclesController.list,
  );

  router.get(
    '/:id',
    requirePermission('vehicle', 'read'),
    validate({ params: vehicleIdParamsSchema }),
    vehiclesController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('vehicle', 'create'),
    validate({ body: createVehicleBodySchema }),
    vehiclesController.create,
  );

  router.patch(
    '/:id',
    csrfProtection(),
    requirePermission('vehicle', 'update'),
    validate({ params: vehicleIdParamsSchema, body: updateVehicleBodySchema }),
    vehiclesController.update,
  );

  router.post(
    '/:id/activate',
    csrfProtection(),
    requirePermission('vehicle', 'update'),
    validate({ params: vehicleIdParamsSchema }),
    vehiclesController.activate,
  );

  router.post(
    '/:id/deactivate',
    csrfProtection(),
    requirePermission('vehicle', 'update'),
    validate({ params: vehicleIdParamsSchema }),
    vehiclesController.deactivate,
  );

  return router;
}
