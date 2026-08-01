import type { NextFunction, Request, Response } from 'express';
import { buildSuccessBody, sendSuccess } from '../shared/responses/api-response.js';
import { getLiveness, getReadiness } from './health.service.js';

export function liveness(_req: Request, res: Response): void {
  sendSuccess(res, getLiveness());
}

export async function readiness(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getReadiness();

    // 503 lets an orchestrator or load balancer stop sending traffic while the
    // process stays alive. The body still uses the standard success envelope
    // because the check itself succeeded in reporting a state.
    res
      .status(result.status === 'ready' ? 200 : 503)
      .json(buildSuccessBody(result, res.locals['requestId'] as string));
  } catch (error) {
    next(error);
  }
}
