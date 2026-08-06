import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { singleFileUpload } from '../../shared/middleware/upload.js';
import { validate } from '../../shared/validation/validate.js';
import * as ctrl from './expenses.controller.js';
import { createExpenseBodySchema, expenseIdParamsSchema, listExpensesQuerySchema, updateExpenseBodySchema } from './expenses.validators.js';

export function expensesRoutes(): Router {
  const r = Router();
  r.use(requireAuth());

  r.get('/', requirePermission('expense', 'read'), validate({ query: listExpensesQuerySchema }), ctrl.list);
  r.get('/:id', requirePermission('expense', 'read'), validate({ params: expenseIdParamsSchema }), ctrl.getById);
  r.post('/', csrfProtection(), requirePermission('expense', 'create'), singleFileUpload('evidenceFile'), validate({ body: createExpenseBodySchema }), ctrl.create);
  r.patch('/:id', csrfProtection(), requirePermission('expense', 'create'), validate({ params: expenseIdParamsSchema, body: updateExpenseBodySchema }), ctrl.update);
  r.get('/:id/evidence', requirePermission('expense', 'read'), validate({ params: expenseIdParamsSchema }), ctrl.downloadEvidence);

  return r;
}
