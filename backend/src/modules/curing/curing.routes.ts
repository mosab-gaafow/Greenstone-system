import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { requireCapability } from '../../shared/auth/capability.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as curingController from './curing.controller.js';
import {
  changeCuringDurationBodySchema,
  curingIdParamsSchema,
  listCuringQuerySchema,
  releaseCuringBodySchema,
} from './curing.validators.js';

/**
 * Curing routes.
 *
 * `change-duration` is a plain role permission — Admin/Super Admin only,
 * with no capability override. `release` uses the `CURING_RELEASE`
 * capability instead of `requirePermission`: Admin/Super Admin always pass,
 * and an Accountant passes only with a granted capability — using
 * `requirePermission('curing', 'release')` here would incorrectly block a
 * capability-holding Accountant, since role permissions and per-user
 * capabilities are two separate systems (see capability.middleware.ts).
 */
export function curingRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('curing', 'read'),
    validate({ query: listCuringQuerySchema }),
    curingController.list,
  );

  router.get(
    '/:id',
    requirePermission('curing', 'read'),
    validate({ params: curingIdParamsSchema }),
    curingController.getById,
  );

  router.patch(
    '/:id/change-duration',
    csrfProtection(),
    requirePermission('curing', 'change-duration'),
    validate({ params: curingIdParamsSchema, body: changeCuringDurationBodySchema }),
    curingController.changeDuration,
  );

  router.post(
    '/:id/release',
    csrfProtection(),
    requireCapability('CURING_RELEASE'),
    validate({ params: curingIdParamsSchema, body: releaseCuringBodySchema }),
    curingController.release,
  );

  return router;
}
