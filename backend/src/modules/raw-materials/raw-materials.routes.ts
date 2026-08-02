import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as rawMaterialsController from './raw-materials.controller.js';
import {
  adjustStockBodySchema,
  createRawMaterialBodySchema,
  listMovementsQuerySchema,
  listRawMaterialsQuerySchema,
  rawMaterialIdParamsSchema,
  setOpeningStockBodySchema,
  updateRawMaterialBodySchema,
} from './raw-materials.validators.js';

/**
 * Raw material routes.
 *
 * Master-data actions are guarded by `raw-material`; stock actions are
 * guarded by the separate `raw-material-stock` resource, per the pre-declared
 * permission map.
 */
export function rawMaterialsRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('raw-material', 'read'),
    validate({ query: listRawMaterialsQuerySchema }),
    rawMaterialsController.list,
  );

  router.get(
    '/:id',
    requirePermission('raw-material', 'read'),
    validate({ params: rawMaterialIdParamsSchema }),
    rawMaterialsController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('raw-material', 'create'),
    validate({ body: createRawMaterialBodySchema }),
    rawMaterialsController.create,
  );

  router.patch(
    '/:id',
    csrfProtection(),
    requirePermission('raw-material', 'update'),
    validate({ params: rawMaterialIdParamsSchema, body: updateRawMaterialBodySchema }),
    rawMaterialsController.update,
  );

  router.post(
    '/:id/activate',
    csrfProtection(),
    requirePermission('raw-material', 'update'),
    validate({ params: rawMaterialIdParamsSchema }),
    rawMaterialsController.activate,
  );

  router.post(
    '/:id/deactivate',
    csrfProtection(),
    requirePermission('raw-material', 'update'),
    validate({ params: rawMaterialIdParamsSchema }),
    rawMaterialsController.deactivate,
  );

  router.get(
    '/:id/stock',
    requirePermission('raw-material-stock', 'read'),
    validate({ params: rawMaterialIdParamsSchema }),
    rawMaterialsController.getStock,
  );

  router.get(
    '/:id/stock/movements',
    requirePermission('raw-material-stock', 'read'),
    validate({ params: rawMaterialIdParamsSchema, query: listMovementsQuerySchema }),
    rawMaterialsController.listMovements,
  );

  router.post(
    '/:id/stock/opening',
    csrfProtection(),
    requirePermission('raw-material-stock', 'set-opening'),
    validate({ params: rawMaterialIdParamsSchema, body: setOpeningStockBodySchema }),
    rawMaterialsController.setOpeningStock,
  );

  router.post(
    '/:id/stock/adjust',
    csrfProtection(),
    requirePermission('raw-material-stock', 'adjust'),
    validate({ params: rawMaterialIdParamsSchema, body: adjustStockBodySchema }),
    rawMaterialsController.adjustStock,
  );

  return router;
}
