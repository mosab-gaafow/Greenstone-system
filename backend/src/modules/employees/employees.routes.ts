import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as employeesController from './employees.controller.js';
import {
  createEmployeeBodySchema,
  employeeIdParamsSchema,
  listEmployeesQuerySchema,
  updateEmployeeBodySchema,
} from './employees.validators.js';

/**
 * Employee routes.
 *
 * Per docs/permissions-matrix.md, the Accountant may only read employees —
 * create and update are Super Admin / Admin only.
 */
export function employeesRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('employee', 'read'),
    validate({ query: listEmployeesQuerySchema }),
    employeesController.list,
  );

  router.get(
    '/:id',
    requirePermission('employee', 'read'),
    validate({ params: employeeIdParamsSchema }),
    employeesController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('employee', 'create'),
    validate({ body: createEmployeeBodySchema }),
    employeesController.create,
  );

  router.patch(
    '/:id',
    csrfProtection(),
    requirePermission('employee', 'update'),
    validate({ params: employeeIdParamsSchema, body: updateEmployeeBodySchema }),
    employeesController.update,
  );

  router.post(
    '/:id/activate',
    csrfProtection(),
    requirePermission('employee', 'update'),
    validate({ params: employeeIdParamsSchema }),
    employeesController.activate,
  );

  router.post(
    '/:id/deactivate',
    csrfProtection(),
    requirePermission('employee', 'update'),
    validate({ params: employeeIdParamsSchema }),
    employeesController.deactivate,
  );

  return router;
}
