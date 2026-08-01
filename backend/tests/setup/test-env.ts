import process from 'node:process';

/**
 * Per-file environment setup.
 *
 * Runs before each test file. `global-setup.ts` has already validated
 * TEST_DATABASE_URL and applied migrations.
 */

process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'];
process.env['FRONTEND_ORIGIN'] ??= 'http://localhost:3000';
process.env['CSRF_SECRET'] ??= 'test-csrf-secret-value-that-is-long-enough';
process.env['BETTER_AUTH_SECRET'] ??= 'test-better-auth-secret-value-long-enough';
process.env['BETTER_AUTH_URL'] ??= 'http://localhost:4000';
process.env['LOG_LEVEL'] = 'silent';

// The suite signs in many times. Enforcement of the real limit is covered by
// tests/api/auth-rate-limit.test.ts, which uses its own low value.
process.env['AUTH_SIGN_IN_MAX_ATTEMPTS'] ??= '10000';
