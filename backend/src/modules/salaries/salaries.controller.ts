/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as svc from './salaries.service.js';
import type { CreateSalaryInput, CorrectSalaryInput, ListSalariesFilters, ReverseSalaryInput } from './salaries.types.js';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const f = getValidatedQuery<ListSalariesFilters>(res); const r = await svc.listSalaries(f); sendSuccess(res, r.salaries, buildPaginationMeta(f.page, f.pageSize, r.totalRecords)); } catch (e) { next(e); }
}
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.getSalary(req.params['id'] as string)); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const evidence = req.file ? { content: req.file.buffer, mimeType: req.file.mimetype, originalFileName: req.file.originalname } : undefined;
    sendCreated(res, await svc.createSalary(req.body as CreateSalaryInput, evidence, getRequestContext(res)));
  } catch (e) { next(e); }
}
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.editSalary(req.params['id'] as string, req.body as Record<string, unknown>, getRequestContext(res))); } catch (e) { next(e); }
}

export async function approve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.approveSalary(req.params['id'] as string, getRequestContext(res))); } catch (e) { next(e); }
}
export async function correct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.correctSalary(req.params['id'] as string, req.body as CorrectSalaryInput, getRequestContext(res))); } catch (e) { next(e); }
}
export async function reverse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.reverseSalary(req.params['id'] as string, req.body as ReverseSalaryInput, getRequestContext(res))); } catch (e) { next(e); }
}
export async function downloadEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ev = await svc.getSalaryEvidence(req.params['id'] as string);
    res.setHeader('Content-Type', ev.mimeType); res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(ev.originalFileName)}"`); res.send(ev.content);
  } catch (e) { next(e); }
}
