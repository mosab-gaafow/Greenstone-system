import process from 'node:process';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * Sign-in rate limiting.
 *
 * The rest of the suite raises the limit so it is not throttled by its own
 * traffic. This file lowers it and builds a fresh application, so the limit is
 * actually enforced rather than merely configured.
 *
 * The modules are imported dynamically after the environment is changed,
 * because the Better Auth instance reads its configuration once at import.
 */

const LIMIT = 3;

let app: import('express').Express;
let authBasePath: string;
let helpers: typeof import('../setup/auth-helpers.js');
let truncateAll: typeof import('../setup/test-database.js').truncateAll;

beforeAll(async () => {
  process.env['AUTH_SIGN_IN_MAX_ATTEMPTS'] = String(LIMIT);

  const { resetEnvCache } = await import('../../src/config/env.js');
  resetEnvCache();

  // Vitest gives each test file its own module registry, and this file imports
  // the app only here — after the limit has been lowered — so the Better Auth
  // instance is built with the new value.
  const appModule = await import('../../src/app.js');
  app = appModule.createApp();
  authBasePath = appModule.AUTH_BASE_PATH;

  helpers = await import('../setup/auth-helpers.js');
  ({ truncateAll } = await import('../setup/test-database.js'));
});

afterAll(async () => {
  const { disconnectTestPrisma } = await import('../setup/test-database.js');
  await disconnectTestPrisma();
});

describe('sign-in rate limiting', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('throttles repeated failed sign-in attempts', async () => {
    const user = await helpers.createTestUser('accountant');

    const statuses: number[] = [];

    for (let attempt = 0; attempt < LIMIT + 3; attempt += 1) {
      const response = await request(app)
        .post(`${authBasePath}/sign-in/email`)
        .send({ email: user.email, password: 'wrong-password-every-time' });

      statuses.push(response.status);
    }

    // Once the window limit is exceeded the endpoint must answer 429 rather
    // than continuing to accept guesses.
    expect(statuses).toContain(429);
  });
});
