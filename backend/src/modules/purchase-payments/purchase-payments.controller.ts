import type { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import { buildPaginationMeta, sendCreated, sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as purchasePaymentsService from './purchase-payments.service.js';
import type {
  CreatePurchasePaymentInput,
  EvidenceFileInput,
  ListPurchasePaymentsFilters,
  ReversePurchasePaymentInput,
} from './purchase-payments.types.js';

/**
 * HTTP handling for purchase payments.
 *
 * Reads validated input, calls the service, returns the standard envelope.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListPurchasePaymentsFilters>(res);
    const result = await purchasePaymentsService.listPurchasePayments(filters);

    sendSuccess(
      res,
      result.payments,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await purchasePaymentsService.getPurchasePayment(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const evidenceFile: EvidenceFileInput | undefined = req.file
      ? {
          content: req.file.buffer,
          mimeType: req.file.mimetype,
          originalFileName: req.file.originalname,
        }
      : undefined;

    sendCreated(
      res,
      await purchasePaymentsService.createPurchasePayment(
        req.body as CreatePurchasePaymentInput,
        evidenceFile,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await purchasePaymentsService.approvePurchasePayment(
        req.params['id'] as string,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function reverse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(
      res,
      await purchasePaymentsService.reversePurchasePayment(
        req.params['id'] as string,
        req.body as ReversePurchasePaymentInput,
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function downloadEvidence(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const evidence = await purchasePaymentsService.getPurchasePaymentEvidence(
      req.params['id'] as string,
    );

    res.setHeader('Content-Type', evidence.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(evidence.originalFileName)}"`,
    );
    res.send(evidence.content);
  } catch (error) {
    next(error);
  }
}
