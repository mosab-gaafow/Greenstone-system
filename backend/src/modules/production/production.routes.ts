import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as productionController from './production.controller.js';
import {
  createProductionBodySchema,
  listProductionQuerySchema,
  productionIdParamsSchema,
} from './production.validators.js';

/**
 * Production routes.
 *
 * Per the pre-declared permission map, every role may create, read, and
 * allocate production — there is no role distinction for this module. There
 * is no update or delete route: a production run, once recorded, is never
 * edited (only curing moves it forward).
 */
export function productionRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('production', 'read'),
    validate({ query: listProductionQuerySchema }),
    productionController.list,
  );

  router.get(
    '/:id',
    requirePermission('production', 'read'),
    validate({ params: productionIdParamsSchema }),
    productionController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('production', 'create'),
    validate({ body: createProductionBodySchema }),
    productionController.create,
  );

  return router;
}
