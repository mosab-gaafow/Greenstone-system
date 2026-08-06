import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { validate } from '../../shared/validation/validate.js';
import * as receiptsController from './receipts.controller.js';
import { listReceiptsQuerySchema, receiptIdParamsSchema } from './receipts.validators.js';

export function receiptsRoutes(): Router {
  const router = Router();
  router.use(requireAuth());

  router.get('/', requirePermission('receipt', 'read'), validate({ query: listReceiptsQuerySchema }), receiptsController.list);
  router.get('/:id', requirePermission('receipt', 'read'), validate({ params: receiptIdParamsSchema }), receiptsController.getById);
  router.get('/:id/pdf', requirePermission('receipt', 'read'), validate({ params: receiptIdParamsSchema }), receiptsController.downloadPdf);

  return router;
}
