import type { Response } from 'express';
import type { ErrorCode } from '../errors/error-codes.js';
import type { FieldErrors } from '../errors/app-error.js';

/**
 * Standard API envelopes.
 *
 * Every response from this API uses one of these two shapes.
 * See docs/technical-blueprint.md sections 5.4 and 5.5.
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface SuccessBody<TData> {
  success: true;
  data: TData;
  meta?: PaginationMeta | Record<string, unknown>;
  requestId: string;
}

export interface ErrorBody {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    fieldErrors?: FieldErrors;
  };
  requestId: string;
}

export function buildSuccessBody<TData>(
  data: TData,
  requestId: string,
  meta?: PaginationMeta | Record<string, unknown>,
): SuccessBody<TData> {
  return meta === undefined
    ? { success: true, data, requestId }
    : { success: true, data, meta, requestId };
}

export function buildErrorBody(
  code: ErrorCode,
  message: string,
  requestId: string,
  fieldErrors?: FieldErrors,
): ErrorBody {
  return {
    success: false,
    error: fieldErrors === undefined ? { code, message } : { code, message, fieldErrors },
    requestId,
  };
}

/**
 * Builds pagination metadata from a total count and the requested page.
 */
export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalRecords: number,
): PaginationMeta {
  return {
    page,
    pageSize,
    totalRecords,
    totalPages: pageSize > 0 ? Math.ceil(totalRecords / pageSize) : 0,
  };
}

/** Sends 200 with a success envelope. */
export function sendSuccess<TData>(
  res: Response,
  data: TData,
  meta?: PaginationMeta | Record<string, unknown>,
): void {
  res.status(200).json(buildSuccessBody(data, res.locals['requestId'] as string, meta));
}

/** Sends 201 with a success envelope. */
export function sendCreated<TData>(res: Response, data: TData): void {
  res.status(201).json(buildSuccessBody(data, res.locals['requestId'] as string));
}

/** Sends 204 with no body. */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}
