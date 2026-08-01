import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';

const app = createApp();

describe('health endpoints', () => {
  afterAll(async () => {
    await disconnectPrisma();
  });

  it('reports liveness without touching the database', async () => {
    const response = await request(app).get(`${API_BASE_PATH}/health/live`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'ok' },
    });
    expect(typeof response.body.data.uptimeSeconds).toBe('number');
  });

  it('includes a request id in the liveness envelope', async () => {
    const response = await request(app).get(`${API_BASE_PATH}/health/live`);

    expect(typeof response.body.requestId).toBe('string');
    expect(response.body.requestId.length).toBeGreaterThan(0);
  });

  it('echoes the request id header', async () => {
    const response = await request(app).get(`${API_BASE_PATH}/health/live`);
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
  });

  it('honours a safe inbound request id', async () => {
    const response = await request(app)
      .get(`${API_BASE_PATH}/health/live`)
      .set('X-Request-Id', 'my-trace-123');

    expect(response.body.requestId).toBe('my-trace-123');
  });

  it('replaces an unsafe inbound request id', async () => {
    const response = await request(app)
      .get(`${API_BASE_PATH}/health/live`)
      .set('X-Request-Id', 'bad id with spaces and <script>');

    expect(response.body.requestId).not.toContain('<script>');
  });

  it('reports readiness with each check passing', async () => {
    const response = await request(app).get(`${API_BASE_PATH}/health/ready`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      status: 'ready',
      checks: { database: 'ok', configuration: 'ok', storage: 'ok' },
    });
  });

  it('never exposes configuration values in health output', async () => {
    const response = await request(app).get(`${API_BASE_PATH}/health/ready`);
    const body = JSON.stringify(response.body);

    expect(body).not.toContain('mysql://');
    expect(body).not.toMatch(/secret/i);
    expect(body).not.toMatch(/password/i);
  });
});
