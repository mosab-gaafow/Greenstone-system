import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { csrfProtection } from '../../shared/middleware/csrf.js';
import { singleFileUpload } from '../../shared/middleware/upload.js';
import { validate } from '../../shared/validation/validate.js';
import * as ctrl from './salaries.controller.js';
import { approveSalaryBodySchema, correctSalaryBodySchema, createSalaryBodySchema, listSalariesQuerySchema, reverseSalaryBodySchema, salaryIdParamsSchema, updateSalaryBodySchema } from './salaries.validators.js';

export function salariesRoutes(): Router {
  const r = Router(); r.use(requireAuth());
  r.get('/', requirePermission('salary', 'read'), validate({ query: listSalariesQuerySchema }), ctrl.list);
  r.get('/:id', requirePermission('salary', 'read'), validate({ params: salaryIdParamsSchema }), ctrl.getById);
  r.post('/', csrfProtection(), requirePermission('salary', 'register'), singleFileUpload('evidenceFile'), validate({ body: createSalaryBodySchema }), ctrl.create);
  r.patch('/:id', csrfProtection(), requirePermission('salary', 'register'), validate({ params: salaryIdParamsSchema, body: updateSalaryBodySchema }), ctrl.update);
  r.post('/:id/approve', csrfProtection(), requirePermission('salary', 'approve'), validate({ params: salaryIdParamsSchema, body: approveSalaryBodySchema }), ctrl.approve);
  r.post('/:id/correct', csrfProtection(), requirePermission('salary', 'correct'), validate({ params: salaryIdParamsSchema, body: correctSalaryBodySchema }), ctrl.correct);
  r.post('/:id/reverse', csrfProtection(), requirePermission('salary', 'reverse'), validate({ params: salaryIdParamsSchema, body: reverseSalaryBodySchema }), ctrl.reverse);
  r.get('/:id/evidence', requirePermission('salary', 'read'), validate({ params: salaryIdParamsSchema }), ctrl.downloadEvidence);
  return r;
}
