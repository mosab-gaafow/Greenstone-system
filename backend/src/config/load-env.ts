import process from 'node:process';

/**
 * Loads `.env` into the process environment.
 *
 * This must be a separate module, imported **first** by every entry point.
 * ESM evaluates all imports before any top-level statement in the importing
 * file, so calling `loadEnvFile()` inside an entry point would run *after*
 * modules that read configuration at import time — such as the Better Auth
 * instance — had already failed.
 *
 * Prisma 7 does not load `.env` automatically, and Node's built-in loader
 * avoids a dotenv dependency. In deployed environments the variables are
 * already present, so a missing file is not an error.
 */
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file — rely on the ambient environment.
}
