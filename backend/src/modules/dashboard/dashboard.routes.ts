import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { validate } from '../../shared/validation/validate.js';
import * as ctrl from './dashboard.controller.js';

const dashboardQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export function dashboardRoutes(): Router {
  const r = Router();
  r.use(requireAuth());
  r.get('/operational', requirePermission('dashboard', 'read'), validate({ query: dashboardQuerySchema }), ctrl.operational);
  return r;
}
