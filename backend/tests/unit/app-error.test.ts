import { describe, expect, it } from 'vitest';
import {
  AppError,
  BusinessRuleViolationError,
  PermissionDeniedError,
  ResourceNotFoundError,
  ValidationError,
  isAppError,
} from '../../src/shared/errors/app-error.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

describe('application errors', () => {
  it('maps each error to its approved code and status', () => {
    expect(new ValidationError()).toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: 422,
    });
    expect(new PermissionDeniedError()).toMatchObject({
      code: ERROR_CODES.PERMISSION_DENIED,
      statusCode: 403,
    });
    expect(new ResourceNotFoundError()).toMatchObject({
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      statusCode: 404,
    });
    expect(new BusinessRuleViolationError('Credit limit reached.')).toMatchObject({
      code: ERROR_CODES.BUSINESS_RULE_VIOLATION,
      statusCode: 422,
    });
  });

  it('identifies application errors', () => {
    expect(isAppError(new ValidationError())).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('marks application errors as operational', () => {
    expect(new ResourceNotFoundError().isOperational).toBe(true);
  });

  it('carries field errors', () => {
    const error = new ValidationError('Invalid.', { phone: ['Phone is required.'] });
    expect(error.fieldErrors).toEqual({ phone: ['Phone is required.'] });
  });

  it('names the error after its subclass', () => {
    expect(new ResourceNotFoundError().name).toBe('ResourceNotFoundError');
  });

  it('preserves the underlying cause', () => {
    const cause = new Error('socket closed');
    const error = new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 500, 'Failed.', undefined, {
      cause,
    });

    expect(error.cause).toBe(cause);
  });
});
