import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as measurementUnitsController from './measurement-units.controller.js';
import {
  createMeasurementUnitBodySchema,
  listMeasurementUnitsQuerySchema,
  measurementUnitIdParamsSchema,
  updateMeasurementUnitBodySchema,
} from './measurement-units.validators.js';

/**
 * Measurement unit routes.
 *
 * Per the pre-declared permission map, super_admin, admin, and accountant may
 * all create, read, and update measurement units.
 */
export function measurementUnitsRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('measurement-unit', 'read'),
    validate({ query: listMeasurementUnitsQuerySchema }),
    measurementUnitsController.list,
  );

  router.get(
    '/:id',
    requirePermission('measurement-unit', 'read'),
    validate({ params: measurementUnitIdParamsSchema }),
    measurementUnitsController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('measurement-unit', 'create'),
    validate({ body: createMeasurementUnitBodySchema }),
    measurementUnitsController.create,
  );

  router.patch(
    '/:id',
    csrfProtection(),
    requirePermission('measurement-unit', 'update'),
    validate({ params: measurementUnitIdParamsSchema, body: updateMeasurementUnitBodySchema }),
    measurementUnitsController.update,
  );

  router.post(
    '/:id/activate',
    csrfProtection(),
    requirePermission('measurement-unit', 'update'),
    validate({ params: measurementUnitIdParamsSchema }),
    measurementUnitsController.activate,
  );

  router.post(
    '/:id/deactivate',
    csrfProtection(),
    requirePermission('measurement-unit', 'update'),
    validate({ params: measurementUnitIdParamsSchema }),
    measurementUnitsController.deactivate,
  );

  return router;
}
