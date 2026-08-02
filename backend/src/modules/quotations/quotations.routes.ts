import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as quotationsController from './quotations.controller.js';
import {
  createQuotationBodySchema,
  listQuotationsQuerySchema,
  quotationIdParamsSchema,
  quotationStatusChangeBodySchema,
  updateQuotationBodySchema,
} from './quotations.validators.js';

/**
 * Quotation routes.
 *
 * Per the pre-declared permission map, super_admin, admin, and accountant may
 * all create, read, update, and change the status of quotations.
 */
export function quotationsRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('quotation', 'read'),
    validate({ query: listQuotationsQuerySchema }),
    quotationsController.list,
  );

  router.get(
    '/:id',
    requirePermission('quotation', 'read'),
    validate({ params: quotationIdParamsSchema }),
    quotationsController.getById,
  );

  router.get(
    '/:id/pdf',
    requirePermission('quotation', 'read'),
    validate({ params: quotationIdParamsSchema }),
    quotationsController.downloadPdf,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('quotation', 'create'),
    validate({ body: createQuotationBodySchema }),
    quotationsController.create,
  );

  router.patch(
    '/:id',
    csrfProtection(),
    requirePermission('quotation', 'update'),
    validate({ params: quotationIdParamsSchema, body: updateQuotationBodySchema }),
    quotationsController.update,
  );

  router.post(
    '/:id/accept',
    csrfProtection(),
    requirePermission('quotation', 'change-status'),
    validate({ params: quotationIdParamsSchema }),
    quotationsController.accept,
  );

  router.post(
    '/:id/reject',
    csrfProtection(),
    requirePermission('quotation', 'change-status'),
    validate({ params: quotationIdParamsSchema, body: quotationStatusChangeBodySchema }),
    quotationsController.reject,
  );

  router.post(
    '/:id/cancel',
    csrfProtection(),
    requirePermission('quotation', 'change-status'),
    validate({ params: quotationIdParamsSchema, body: quotationStatusChangeBodySchema }),
    quotationsController.cancel,
  );

  return router;
}
