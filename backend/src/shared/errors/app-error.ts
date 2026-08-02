import { ERROR_CODES, type ErrorCode } from './error-codes.js';

/**
 * Field-level validation details, keyed by field path.
 */
export type FieldErrors = Record<string, string[]>;

/**
 * Base class for every error the API deliberately returns.
 *
 * Anything that is not an AppError is treated as unexpected: it is logged with
 * full detail and reported to the client as a generic 500.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly fieldErrors: FieldErrors | undefined;
  /** True for errors that are safe to show to the user as-is. */
  readonly isOperational = true;

  constructor(
    code: ErrorCode,
    statusCode: number,
    message: string,
    fieldErrors?: FieldErrors,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'The submitted information is not valid.', fieldErrors?: FieldErrors) {
    super(ERROR_CODES.VALIDATION_ERROR, 422, message, fieldErrors);
  }
}

export class AuthenticationRequiredError extends AppError {
  constructor(message = 'Authentication is required.') {
    super(ERROR_CODES.AUTHENTICATION_REQUIRED, 401, message);
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = 'Your session has expired. Please sign in again.') {
    super(ERROR_CODES.SESSION_EXPIRED, 401, message);
  }
}

export class PermissionDeniedError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(ERROR_CODES.PERMISSION_DENIED, 403, message);
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(message = 'The requested record was not found.') {
    super(ERROR_CODES.RESOURCE_NOT_FOUND, 404, message);
  }
}

export class ResourceConflictError extends AppError {
  constructor(message = 'The record has been changed by another action.') {
    super(ERROR_CODES.RESOURCE_CONFLICT, 409, message);
  }
}

export class BusinessRuleViolationError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.BUSINESS_RULE_VIOLATION, 422, message);
  }
}

export class InvalidDocumentStatusError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.INVALID_DOCUMENT_STATUS, 409, message);
  }
}

export class CustomerCreditBlockedError extends AppError {
  constructor(message = 'This customer is blocked and cannot place a new credit order.') {
    super(ERROR_CODES.CUSTOMER_CREDIT_BLOCKED, 422, message);
  }
}

export class InsufficientRawMaterialError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.INSUFFICIENT_RAW_MATERIAL, 422, message);
  }
}

export class InsufficientFinishedStockError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.INSUFFICIENT_FINISHED_STOCK, 422, message);
  }
}

export class DuplicateDocumentError extends AppError {
  constructor(message = 'A record with these details already exists.') {
    super(ERROR_CODES.DUPLICATE_DOCUMENT, 409, message);
  }
}

export class FileValidationError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.FILE_VALIDATION_FAILED, 422, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(ERROR_CODES.INTERNAL_SERVER_ERROR, 500, message, undefined, options);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
