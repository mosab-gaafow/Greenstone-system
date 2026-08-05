import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as svc from './customer-payments.service.js';
import type { ApprovePaymentInput, CreatePaymentInput, ListPaymentsFilters, ReversePaymentInput } from './customer-payments.types.js';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const f = getValidatedQuery<ListPaymentsFilters>(res); const r = await svc.listPayments(f); sendSuccess(res, r.payments, buildPaginationMeta(f.page, f.pageSize, r.totalRecords)); } catch (e) { next(e); }
}
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.getPayment(req.params['id'] as string)); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendCreated(res, await svc.createPayment(req.body as CreatePaymentInput, getRequestContext(res))); } catch (e) { next(e); }
}
export async function approve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.approve(req.params['id'] as string, req.body as ApprovePaymentInput, getRequestContext(res))); } catch (e) { next(e); }
}
export async function reverse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.reverse(req.params['id'] as string, req.body as ReversePaymentInput, getRequestContext(res))); } catch (e) { next(e); }
}
