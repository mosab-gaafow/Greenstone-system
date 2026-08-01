import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as usersController from './users.controller.js';
import {
  capabilityBodySchema,
  createUserBodySchema,
  deactivateBodySchema,
  listUsersQuerySchema,
  updateRoleBodySchema,
  userIdParamsSchema,
} from './users.validators.js';

/**
 * User management routes.
 *
 * Routes attach authentication, permission, CSRF, and validation middleware,
 * then call a controller. They contain no business logic.
 *
 * Only Super Admin and Admin hold the `user` permissions, so the Accountant is
 * refused by `requirePermission` on every route here.
 */
export function usersRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('user', 'list'),
    validate({ query: listUsersQuerySchema }),
    usersController.list,
  );

  router.get(
    '/:id',
    requirePermission('user', 'get'),
    validate({ params: userIdParamsSchema }),
    usersController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('user', 'create'),
    validate({ body: createUserBodySchema }),
    usersController.create,
  );

  router.patch(
    '/:id/role',
    csrfProtection(),
    requirePermission('user', 'set-role'),
    validate({ params: userIdParamsSchema, body: updateRoleBodySchema }),
    usersController.updateRole,
  );

  router.post(
    '/:id/deactivate',
    csrfProtection(),
    requirePermission('user', 'ban'),
    validate({ params: userIdParamsSchema, body: deactivateBodySchema }),
    usersController.deactivate,
  );

  router.post(
    '/:id/activate',
    csrfProtection(),
    requirePermission('user', 'ban'),
    validate({ params: userIdParamsSchema, body: deactivateBodySchema }),
    usersController.activate,
  );

  router.post(
    '/:id/revoke-sessions',
    csrfProtection(),
    requirePermission('session', 'revoke'),
    validate({ params: userIdParamsSchema }),
    usersController.revokeSessions,
  );

  router.post(
    '/:id/capabilities',
    csrfProtection(),
    requirePermission('capability', 'grant'),
    validate({ params: userIdParamsSchema, body: capabilityBodySchema }),
    usersController.grantCapability,
  );

  router.delete(
    '/:id/capabilities',
    csrfProtection(),
    requirePermission('capability', 'revoke'),
    validate({ params: userIdParamsSchema, body: capabilityBodySchema }),
    usersController.revokeCapability,
  );

  return router;
}
