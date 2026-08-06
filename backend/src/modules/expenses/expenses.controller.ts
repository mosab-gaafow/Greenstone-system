/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as svc from './expenses.service.js';
import type { CreateExpenseInput, ListExpensesFilters } from './expenses.types.js';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const f = getValidatedQuery<ListExpensesFilters>(res); const r = await svc.listExpenses(f); sendSuccess(res, r.expenses, buildPaginationMeta(f.page, f.pageSize, r.totalRecords)); } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.getExpense(req.params['id'] as string)); } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const evidence = req.file ? { content: req.file.buffer, mimeType: req.file.mimetype, originalFileName: req.file.originalname } : undefined;
    sendCreated(res, await svc.createExpense(req.body as CreateExpenseInput, evidence, getRequestContext(res)));
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.editExpense(req.params['id'] as string, req.body as any, getRequestContext(res))); } catch (e) { next(e); }
}

export async function downloadEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const evidence = await svc.getExpenseEvidence(req.params['id'] as string);
    res.setHeader('Content-Type', evidence.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(evidence.originalFileName)}"`);
    res.send(evidence.content);
  } catch (e) { next(e); }
}
