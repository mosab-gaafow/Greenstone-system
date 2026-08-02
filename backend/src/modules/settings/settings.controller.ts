import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { sendSuccess } from '../../shared/responses/api-response.js';
import * as settingsService from './settings.service.js';
import type { UpdateCompanySettingsInput } from './settings.types.js';

/**
 * HTTP handling for company settings.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await settingsService.getSettings());
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await settingsService.editSettings(
        req.body as UpdateCompanySettingsInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
