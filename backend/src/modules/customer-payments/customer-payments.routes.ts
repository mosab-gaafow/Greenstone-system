import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as ctrl from './customer-payments.controller.js';
import { createPaymentBodySchema, approvePaymentBodySchema, reversePaymentBodySchema, paymentIdParamsSchema, listPaymentsQuerySchema } from './customer-payments.validators.js';

export function customerPaymentsRoutes(): Router {
  const r = Router();
  r.use(requireAuth());
  r.get('/', requirePermission('customer-payment', 'read'), validate({ query: listPaymentsQuerySchema }), ctrl.list);
  r.get('/:id', requirePermission('customer-payment', 'read'), validate({ params: paymentIdParamsSchema }), ctrl.getById);
  r.post('/', csrfProtection(), requirePermission('customer-payment', 'create'), validate({ body: createPaymentBodySchema }), ctrl.create);
  r.post('/:id/approve', csrfProtection(), requirePermission('customer-payment', 'approve'), validate({ params: paymentIdParamsSchema, body: approvePaymentBodySchema }), ctrl.approve);
  r.post('/:id/reverse', csrfProtection(), requirePermission('customer-payment', 'reverse'), validate({ params: paymentIdParamsSchema, body: reversePaymentBodySchema }), ctrl.reverse);
  return r;
}
