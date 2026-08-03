import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { singleFileUpload } from '../../shared/middleware/upload.js';
import { validate } from '../../shared/validation/validate.js';
import * as purchasePaymentsController from './purchase-payments.controller.js';
import {
  createPurchasePaymentBodySchema,
  listPurchasePaymentsQuerySchema,
  purchasePaymentIdParamsSchema,
  reversePurchasePaymentBodySchema,
} from './purchase-payments.validators.js';

/**
 * Purchase payment routes.
 *
 * Per the pre-declared permission map: all three roles may create and read;
 * approve and reverse are Admin/Super Admin only. Never permanently deleted
 * — no delete route exists.
 *
 * `singleFileUpload` is applied only here — see backend/CLAUDE.md and the
 * explicit Phase 7D instruction not to register multer globally.
 */
export function purchasePaymentsRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('purchase-payment', 'read'),
    validate({ query: listPurchasePaymentsQuerySchema }),
    purchasePaymentsController.list,
  );

  router.get(
    '/:id',
    requirePermission('purchase-payment', 'read'),
    validate({ params: purchasePaymentIdParamsSchema }),
    purchasePaymentsController.getById,
  );

  router.get(
    '/:id/evidence',
    requirePermission('purchase-payment', 'read'),
    validate({ params: purchasePaymentIdParamsSchema }),
    purchasePaymentsController.downloadEvidence,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('purchase-payment', 'create'),
    singleFileUpload('evidenceFile'),
    validate({ body: createPurchasePaymentBodySchema }),
    purchasePaymentsController.create,
  );

  router.post(
    '/:id/approve',
    csrfProtection(),
    requirePermission('purchase-payment', 'approve'),
    validate({ params: purchasePaymentIdParamsSchema }),
    purchasePaymentsController.approve,
  );

  router.post(
    '/:id/reverse',
    csrfProtection(),
    requirePermission('purchase-payment', 'reverse'),
    validate({ params: purchasePaymentIdParamsSchema, body: reversePurchasePaymentBodySchema }),
    purchasePaymentsController.reverse,
  );

  return router;
}
