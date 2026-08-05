import { execFileSync } from 'node:child_process';
import process from 'node:process';

/**
 * Global test setup.
 *
 * Guards against the single most damaging test mistake — running the suite
 * against the development or production database — and then applies migrations
 * to the test database.
 */
export default function globalSetup(): void {
  try {
    process.loadEnvFile('.env');
  } catch {
    // No .env file — CI supplies the variables directly.
  }

  const testUrl = process.env['TEST_DATABASE_URL'];
  const devUrl = process.env['DATABASE_URL'];

  if (!testUrl) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Add it to backend/.env before running the tests.',
    );
  }

  if (devUrl && testUrl === devUrl) {
    throw new Error(
      'TEST_DATABASE_URL must not be the same as DATABASE_URL. The test suite deletes all data.',
    );
  }

  assertTestDatabaseName(testUrl);

  // Migrations are applied with DATABASE_URL pointed at the test database,
  // because prisma.config.ts reads that variable.
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'pipe',
  });
}

/**
 * Requires the database name to end in `_test`.
 *
 * A naming convention is a weak guarantee on its own, but combined with the
 * inequality check above it makes an accidental wipe of a real database very
 * unlikely.
 */
const REQUIRED_TEST_DB = 'greenstone_test';

function assertTestDatabaseName(url: string): void {
  const databaseName = new URL(url).pathname.replace(/^\//, '');

  if (databaseName !== REQUIRED_TEST_DB) {
    throw new Error(
      `The test database must be exactly "${REQUIRED_TEST_DB}". ` +
      `Refusing to run tests against "${databaseName}". ` +
      'Check TEST_DATABASE_URL in your .env file.',
    );
  }
}
