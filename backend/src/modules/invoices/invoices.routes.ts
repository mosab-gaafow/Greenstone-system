import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as invoicesController from './invoices.controller.js';
import { createInvoiceBodySchema, invoiceIdParamsSchema, listInvoicesQuerySchema, voidInvoiceBodySchema } from './invoices.validators.js';

export function invoicesRoutes(): Router {
  const router = Router();
  router.use(requireAuth());

  router.get('/', requirePermission('invoice', 'read'), validate({ query: listInvoicesQuerySchema }), invoicesController.list);
  router.get('/:id', requirePermission('invoice', 'read'), validate({ params: invoiceIdParamsSchema }), invoicesController.getById);
  router.post('/', csrfProtection(), requirePermission('invoice', 'create'), validate({ body: createInvoiceBodySchema }), invoicesController.create);
  router.post('/:id/void', csrfProtection(), requirePermission('invoice', 'void'), validate({ params: invoiceIdParamsSchema, body: voidInvoiceBodySchema }), invoicesController.voidInvoice);
  router.get('/:id/pdf', requirePermission('invoice', 'read'), validate({ params: invoiceIdParamsSchema }), invoicesController.downloadPdf);

  return router;
}
