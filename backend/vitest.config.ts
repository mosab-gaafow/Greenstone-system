import process from 'node:process';
import { defineConfig } from 'vitest/config';

// Load .env at config resolution time — this runs in the orchestrator
// process before any worker starts, so every worker inherits the correct
// DATABASE_URL via Vitest's env option.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file — rely on the ambient environment.
}

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const devDatabaseUrl = process.env['DATABASE_URL'];

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Add it to backend/.env before running the tests.',
  );
}

if (testDatabaseUrl === devDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL must not be the same as DATABASE_URL. The test suite deletes all data.',
  );
}

const REQUIRED_TEST_DB = 'greenstone_test';

const databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, '');
if (databaseName !== REQUIRED_TEST_DB) {
  throw new Error(
    `The test database must be exactly "${REQUIRED_TEST_DB}". ` +
    `Refusing to run against "${databaseName}".`,
  );
}

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/setup/global-setup.ts'],
    setupFiles: ['./tests/setup/test-env.ts'],
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // env is merged into process.env in the worker before any module loads.
    // This is the earliest possible point — earlier than setupFiles.
    env: {
      DATABASE_URL: testDatabaseUrl,
    },
  },
});
