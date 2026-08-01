import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { getEnv } from '../../config/env.js';
import { AppError, isAppError, type FieldErrors } from '../errors/app-error.js';
import { ERROR_CODES, GENERIC_ERROR_MESSAGE, type ErrorCode } from '../errors/error-codes.js';
import { buildErrorBody } from '../responses/api-response.js';

/**
 * The single global error handler.
 *
 * Everything the API returns as an error passes through here, so the envelope,
 * status codes and logging stay consistent.
 *
 * See docs/technical-blueprint.md section 11.4.
 */
export function errorHandler() {
  return (error: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const requestId =
      (res.locals['requestId'] as string | undefined) ?? String(req.id ?? 'unknown');
    const normalised = normaliseError(error);

    logError(req, error, normalised);

    res
      .status(normalised.statusCode)
      .json(
        buildErrorBody(
          normalised.code,
          normalised.message,
          requestId,
          normalised.fieldErrors ?? undefined,
        ),
      );
  };
}

interface NormalisedError {
  code: ErrorCode;
  statusCode: number;
  message: string;
  fieldErrors: FieldErrors | undefined;
  /** False for anything unexpected, which must not leak details. */
  isOperational: boolean;
}

function normaliseError(error: unknown): NormalisedError {
  if (isAppError(error)) {
    return {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      fieldErrors: error.fieldErrors,
      isOperational: true,
    };
  }

  if (error instanceof ZodError) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: 422,
      message: 'The submitted information is not valid.',
      fieldErrors: toFieldErrors(error),
      isOperational: true,
    };
  }

  const prismaError = normalisePrismaError(error);
  if (prismaError) {
    return prismaError;
  }

  // Malformed JSON body. Express raises this before any route runs.
  if (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as { status?: number }).status === 400
  ) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: 400,
      message: 'The request body is not valid JSON.',
      fieldErrors: undefined,
      isOperational: true,
    };
  }

  return {
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    statusCode: 500,
    message: GENERIC_ERROR_MESSAGE,
    fieldErrors: undefined,
    isOperational: false,
  };
}

/**
 * Maps the Prisma error codes that correspond to a client-visible condition.
 * Anything else stays an unexpected 500.
 */
function normalisePrismaError(error: unknown): NormalisedError | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  switch (code) {
    case 'P2002':
      return {
        code: ERROR_CODES.DUPLICATE_DOCUMENT,
        statusCode: 409,
        message: 'A record with these details already exists.',
        fieldErrors: undefined,
        isOperational: true,
      };
    case 'P2025':
      return {
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        statusCode: 404,
        message: 'The requested record was not found.',
        fieldErrors: undefined,
        isOperational: true,
      };
    case 'P2003':
      return {
        code: ERROR_CODES.RESOURCE_CONFLICT,
        statusCode: 409,
        message: 'This record is referenced by other records.',
        fieldErrors: undefined,
        isOperational: true,
      };
    default:
      return null;
  }
}

export function toFieldErrors(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return fieldErrors;
}

function logError(req: Request, original: unknown, normalised: NormalisedError): void {
  const log = req.log ?? undefined;

  if (!log) {
    return;
  }

  const context = {
    errorCode: normalised.code,
    statusCode: normalised.statusCode,
    method: req.method,
    path: req.path,
  };

  if (normalised.isOperational) {
    log.warn(context, normalised.message);
    return;
  }

  // Unexpected: keep the full error server-side, including the stack.
  log.error(
    {
      ...context,
      err: original,
      // Stacks are logged, never returned. See technical blueprint 5.5.
      stack: getEnv().isProduction ? undefined : describeStack(original),
    },
    'Unhandled error',
  );
}

function describeStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

export { AppError };
