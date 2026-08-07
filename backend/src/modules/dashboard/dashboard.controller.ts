import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as svc from './dashboard.service.js';
import type { DashboardQuery } from './dashboard.types.js';

export async function operational(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = getValidatedQuery<DashboardQuery>(res);
    sendSuccess(res, await svc.getDashboard(q));
  } catch (e) { next(e); }
}
