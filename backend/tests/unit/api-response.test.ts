import { describe, expect, it } from 'vitest';
import {
  buildErrorBody,
  buildPaginationMeta,
  buildSuccessBody,
} from '../../src/shared/responses/api-response.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

describe('API envelopes', () => {
  it('builds the approved success shape', () => {
    expect(buildSuccessBody({ id: '1' }, 'req-1')).toEqual({
      success: true,
      data: { id: '1' },
      requestId: 'req-1',
    });
  });

  it('omits meta entirely when not supplied', () => {
    expect(buildSuccessBody(null, 'req-1')).not.toHaveProperty('meta');
  });

  it('includes meta when supplied', () => {
    const body = buildSuccessBody([], 'req-1', buildPaginationMeta(2, 25, 60));

    expect(body.meta).toEqual({
      page: 2,
      pageSize: 25,
      totalRecords: 60,
      totalPages: 3,
    });
  });

  it('builds the approved error shape', () => {
    expect(buildErrorBody(ERROR_CODES.RESOURCE_NOT_FOUND, 'Not found.', 'req-2')).toEqual({
      success: false,
      error: { code: 'RESOURCE_NOT_FOUND', message: 'Not found.' },
      requestId: 'req-2',
    });
  });

  it('includes field errors only when supplied', () => {
    const withFields = buildErrorBody(ERROR_CODES.VALIDATION_ERROR, 'Invalid.', 'req-3', {
      name: ['Name is required.'],
    });

    expect(withFields.error.fieldErrors).toEqual({ name: ['Name is required.'] });
    expect(
      buildErrorBody(ERROR_CODES.VALIDATION_ERROR, 'Invalid.', 'req-3').error,
    ).not.toHaveProperty('fieldErrors');
  });

  it('reports zero pages for an empty result set', () => {
    expect(buildPaginationMeta(1, 25, 0).totalPages).toBe(0);
  });

  it('rounds partial pages up', () => {
    expect(buildPaginationMeta(1, 25, 26).totalPages).toBe(2);
  });
});
