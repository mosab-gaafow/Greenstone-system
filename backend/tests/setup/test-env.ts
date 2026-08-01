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
process.env['LOG_LEVEL'] = 'silent';
