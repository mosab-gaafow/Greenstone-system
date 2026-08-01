import process from 'node:process';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Readiness with Redis unreachable.
 *
 * The point of this file is a single guarantee: **a cache outage must not take
 * the application out of service.** Readiness reports the degradation and still
 * answers 200, because every request can be served from MySQL.
 *
 * It builds its own application after pointing Redis at a dead port, so the
 * rest of the suite is unaffected.
 */

const DEAD_REDIS_URL = 'redis://127.0.0.1:6399';

let app: import('express').Express;
let apiBasePath: string;
let disconnect: () => Promise<void>;

const originalRedisUrl = process.env['REDIS_URL'];

beforeAll(async () => {
  process.env['REDIS_URL'] = DEAD_REDIS_URL;

  const { resetEnvCache } = await import('../../src/config/env.js');
  const { resetRedisClient } = await import('../../src/shared/cache/redis.client.js');
  resetRedisClient();
  resetEnvCache();

  const appModule = await import('../../src/app.js');
  app = appModule.createApp();
  apiBasePath = appModule.API_BASE_PATH;

  const client = await import('../../src/shared/cache/redis.client.js');
  client.getRedisClient();
  disconnect = client.disconnectRedis;

  // Give the connection attempt time to fail.
  await new Promise((resolve) => setTimeout(resolve, 400));
});

afterAll(async () => {
  await disconnect();

  if (originalRedisUrl === undefined) {
    delete process.env['REDIS_URL'];
  } else {
    process.env['REDIS_URL'] = originalRedisUrl;
  }

  const { resetEnvCache } = await import('../../src/config/env.js');
  const { resetRedisClient } = await import('../../src/shared/cache/redis.client.js');
  resetRedisClient();
  resetEnvCache();

  const { disconnectPrisma } = await import('../../src/shared/database/prisma.js');
  await disconnectPrisma();
});

describe('readiness with the cache unavailable', () => {
  it('reports the cache as degraded', async () => {
    const response = await request(app).get(`${apiBasePath}/health/ready`);

    expect(response.body.data.checks.cache).toBe('degraded');
  });

  it('stays ready and answers 200', async () => {
    const response = await request(app).get(`${apiBasePath}/health/ready`);

    expect(response.body.data.status).toBe('ready');
    expect(response.status).toBe(200);
  });

  it('keeps the required checks passing', async () => {
    const response = await request(app).get(`${apiBasePath}/health/ready`);

    expect(response.body.data.checks).toMatchObject({
      database: 'ok',
      configuration: 'ok',
      storage: 'ok',
    });
  });

  it('still answers liveness, which never touches Redis', async () => {
    const response = await request(app).get(`${apiBasePath}/health/live`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });
});
