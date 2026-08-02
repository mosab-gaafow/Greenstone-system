import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as customerCreditController from './customer-credit.controller.js';
import { customerIdParamsSchema, setOpeningBalanceBodySchema } from './customer-credit.validators.js';

/**
 * Customer credit routes.
 *
 * Mounted under the same `/customers` base path as the customers module —
 * these are customer sub-resources, guarded by the separate `customer-credit`
 * permission resource rather than `customer`.
 */
export function customerCreditRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/:id/credit-status',
    requirePermission('customer-credit', 'read'),
    validate({ params: customerIdParamsSchema }),
    customerCreditController.getCreditStatus,
  );

  router.patch(
    '/:id/opening-balance',
    csrfProtection(),
    requirePermission('customer-credit', 'set-opening-balance'),
    validate({ params: customerIdParamsSchema, body: setOpeningBalanceBodySchema }),
    customerCreditController.setOpeningBalance,
  );

  return router;
}
