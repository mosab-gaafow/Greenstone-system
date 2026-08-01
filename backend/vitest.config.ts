import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/setup/global-setup.ts'],
    setupFiles: ['./tests/setup/test-env.ts'],
    include: ['tests/**/*.test.ts'],
    // Integration tests share one MySQL database. Running files in parallel
    // would let one file's truncation wipe another file's rows mid-test.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
