import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { validate } from '../../shared/validation/validate.js';
import * as settingsController from './settings.controller.js';
import { updateSettingsBodySchema } from './settings.validators.js';

/**
 * Company settings routes.
 *
 * `settings` is only granted to super_admin and admin — the Accountant has no
 * `settings` permission at all, per business-blueprint section 5.3.
 */
export function settingsRoutes(): Router {
  const router = Router();

  router.use(requireAuth());

  router.get('/', requirePermission('settings', 'read'), settingsController.getSettings);

  router.patch(
    '/',
    csrfProtection(),
    requirePermission('settings', 'update'),
    validate({ body: updateSettingsBodySchema }),
    settingsController.updateSettings,
  );

  return router;
}
