import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { csrfProtection, getCsrfUtilities } from '../../src/shared/middleware/csrf.js';
import { errorHandler } from '../../src/shared/middleware/error-handler.js';
import { requestId } from '../../src/shared/middleware/request-id.js';

/**
 * App exposing a token endpoint and a protected mutation, so the CSRF
 * foundation can be exercised before any business routes exist.
 */
function buildCsrfApp() {
  const app = express();
  app.use(requestId());
  app.use(express.json());
  app.use(cookieParser());

  app.get('/csrf-token', (req, res) => {
    res.status(200).json({ token: getCsrfUtilities().issueCsrfToken(req, res) });
  });

  app.post('/protected', csrfProtection(), (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(errorHandler());
  return app;
}

describe('security headers', () => {
  it('sets the expected hardening headers', async () => {
    const response = await request(createApp()).get(`${API_BASE_PATH}/health/live`);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('does not advertise the server technology', async () => {
    const response = await request(createApp()).get(`${API_BASE_PATH}/health/live`);
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('exposes rate limit headers', async () => {
    const response = await request(createApp()).get(`${API_BASE_PATH}/health/live`);
    expect(response.headers).toHaveProperty('ratelimit');
  });
});

describe('CSRF protection', () => {
  it('rejects a state-changing request with no token', async () => {
    const response = await request(buildCsrfApp()).post('/protected').send({});

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('PERMISSION_DENIED');
    expect(response.body.success).toBe(false);
  });

  it('rejects a forged token', async () => {
    const agent = request.agent(buildCsrfApp());
    await agent.get('/csrf-token');

    const response = await agent.post('/protected').set(CSRF_HEADER_NAME, 'forged-token').send({});

    expect(response.status).toBe(403);
  });

  it('accepts a request carrying the issued token', async () => {
    const agent = request.agent(buildCsrfApp());
    const tokenResponse = await agent.get('/csrf-token');

    const response = await agent
      .post('/protected')
      .set(CSRF_HEADER_NAME, tokenResponse.body.token as string)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('does not require a token for safe methods', async () => {
    const response = await request(buildCsrfApp()).get('/csrf-token');
    expect(response.status).toBe(200);
  });
});
