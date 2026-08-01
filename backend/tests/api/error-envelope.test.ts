import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import {
  BusinessRuleViolationError,
  PermissionDeniedError,
} from '../../src/shared/errors/app-error.js';
import { errorHandler } from '../../src/shared/middleware/error-handler.js';
import { requestId } from '../../src/shared/middleware/request-id.js';

/**
 * Builds a small app that raises a chosen error, so the global handler can be
 * exercised without inventing business routes.
 */
function appThatThrows(error: unknown) {
  const app = express();
  app.use(requestId());
  app.use(express.json());
  app.get('/boom', (_req, _res, next) => {
    next(error);
  });
  app.use(errorHandler());
  return app;
}

describe('error envelope', () => {
  it('returns the approved shape for an unknown route', async () => {
    const response = await request(createApp()).get(`${API_BASE_PATH}/does-not-exist`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'RESOURCE_NOT_FOUND' },
    });
    expect(typeof response.body.requestId).toBe('string');
    expect(response.body.error.message).toBeTruthy();
  });

  it('maps a permission error to 403', async () => {
    const response = await request(appThatThrows(new PermissionDeniedError())).get('/boom');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('PERMISSION_DENIED');
  });

  it('maps a business rule violation to 422', async () => {
    const response = await request(
      appThatThrows(new BusinessRuleViolationError('Credit limit reached.')),
    ).get('/boom');

    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({
      code: 'BUSINESS_RULE_VIOLATION',
      message: 'Credit limit reached.',
    });
  });

  it('hides the details of an unexpected error', async () => {
    const secret = 'connection string mysql://root:hunter2@db/greenstone';
    const response = await request(appThatThrows(new Error(secret))).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
  });

  it('never returns a stack trace', async () => {
    const response = await request(appThatThrows(new Error('kaboom'))).get('/boom');

    expect(JSON.stringify(response.body)).not.toMatch(/at .*\.ts:/);
    expect(response.body.error).not.toHaveProperty('stack');
  });

  it('maps a Prisma unique violation to 409', async () => {
    const prismaError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    const response = await request(appThatThrows(prismaError)).get('/boom');

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_DOCUMENT');
  });

  it('maps a Prisma missing record to 404', async () => {
    const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
    const response = await request(appThatThrows(prismaError)).get('/boom');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('rejects a malformed JSON body with 400', async () => {
    const response = await request(createApp())
      .post(`${API_BASE_PATH}/health/live`)
      .set('Content-Type', 'application/json')
      .send('{"broken": ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
