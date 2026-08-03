import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as vehicleOwnersController from './vehicle-owners.controller.js';
import {
  createVehicleOwnerBodySchema,
  listVehicleOwnersQuerySchema,
  updateVehicleOwnerBodySchema,
  vehicleOwnerIdParamsSchema,
} from './vehicle-owners.validators.js';

/**
 * Vehicle Owner routes.
 *
 * Per docs/permissions-matrix.md, the Accountant has full create/read/update
 * access, same as Admin and Super Admin — matching the existing
 * `driver`/`vehicle` pattern.
 */
export function vehicleOwnersRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('vehicle-owner', 'read'),
    validate({ query: listVehicleOwnersQuerySchema }),
    vehicleOwnersController.list,
  );

  router.get(
    '/:id',
    requirePermission('vehicle-owner', 'read'),
    validate({ params: vehicleOwnerIdParamsSchema }),
    vehicleOwnersController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('vehicle-owner', 'create'),
    validate({ body: createVehicleOwnerBodySchema }),
    vehicleOwnersController.create,
  );

  router.patch(
    '/:id',
    csrfProtection(),
    requirePermission('vehicle-owner', 'update'),
    validate({ params: vehicleOwnerIdParamsSchema, body: updateVehicleOwnerBodySchema }),
    vehicleOwnersController.update,
  );

  router.post(
    '/:id/activate',
    csrfProtection(),
    requirePermission('vehicle-owner', 'update'),
    validate({ params: vehicleOwnerIdParamsSchema }),
    vehicleOwnersController.activate,
  );

  router.post(
    '/:id/deactivate',
    csrfProtection(),
    requirePermission('vehicle-owner', 'update'),
    validate({ params: vehicleOwnerIdParamsSchema }),
    vehicleOwnersController.deactivate,
  );

  return router;
}
