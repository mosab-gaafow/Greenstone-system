import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as customersController from './customers.controller.js';
import {
  addressParamsSchema,
  createAddressBodySchema,
  createCustomerBodySchema,
  customerIdParamsSchema,
  forceDeactivateCustomerBodySchema,
  listCustomersQuerySchema,
  updateAddressBodySchema,
  updateCustomerBodySchema,
} from './customers.validators.js';

/**
 * Customer routes, including addresses.
 *
 * Addresses are nested under their customer, which makes the ownership rule
 * visible in the URL: an address is always reached through the customer it
 * belongs to, and the service verifies that relationship on every call.
 *
 * Per docs/permissions-matrix.md the Accountant may create and edit customers
 * and their addresses, and may normally deactivate one (subject to the
 * service-layer safeguards). Force-deactivation (Phase 6E addendum) is
 * Super Admin/Admin only.
 */
export function customersRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get(
    '/',
    requirePermission('customer', 'read'),
    validate({ query: listCustomersQuerySchema }),
    customersController.list,
  );

  router.get(
    '/:id',
    requirePermission('customer', 'read'),
    validate({ params: customerIdParamsSchema }),
    customersController.getById,
  );

  router.post(
    '/',
    csrfProtection(),
    requirePermission('customer', 'create'),
    validate({ body: createCustomerBodySchema }),
    customersController.create,
  );

  router.patch(
    '/:id',
    csrfProtection(),
    requirePermission('customer', 'update'),
    validate({ params: customerIdParamsSchema, body: updateCustomerBodySchema }),
    customersController.update,
  );

  router.post(
    '/:id/activate',
    csrfProtection(),
    requirePermission('customer', 'update'),
    validate({ params: customerIdParamsSchema }),
    customersController.activate,
  );

  router.post(
    '/:id/deactivate',
    csrfProtection(),
    requirePermission('customer', 'update'),
    validate({ params: customerIdParamsSchema }),
    customersController.deactivate,
  );

  router.post(
    '/:id/force-deactivate',
    csrfProtection(),
    requirePermission('customer', 'force-deactivate'),
    validate({ params: customerIdParamsSchema, body: forceDeactivateCustomerBodySchema }),
    customersController.forceDeactivate,
  );

  // --- Addresses ------------------------------------------------------------

  router.post(
    '/:id/addresses',
    csrfProtection(),
    requirePermission('customer-address', 'create'),
    validate({ params: customerIdParamsSchema, body: createAddressBodySchema }),
    customersController.createAddress,
  );

  router.patch(
    '/:id/addresses/:addressId',
    csrfProtection(),
    requirePermission('customer-address', 'update'),
    validate({ params: addressParamsSchema, body: updateAddressBodySchema }),
    customersController.updateAddress,
  );

  router.post(
    '/:id/addresses/:addressId/activate',
    csrfProtection(),
    requirePermission('customer-address', 'update'),
    validate({ params: addressParamsSchema }),
    customersController.activateAddress,
  );

  router.post(
    '/:id/addresses/:addressId/deactivate',
    csrfProtection(),
    requirePermission('customer-address', 'update'),
    validate({ params: addressParamsSchema }),
    customersController.deactivateAddress,
  );

  return router;
}
