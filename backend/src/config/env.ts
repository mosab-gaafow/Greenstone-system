import process from 'node:process';
import { z } from 'zod';

/**
 * Validated environment configuration.
 *
 * The process must fail fast and loudly when configuration is missing or
 * invalid, rather than starting and failing later on the first request.
 *
 * See docs/technical-blueprint.md section 12.6.
 */

const nodeEnvSchema = z.enum(['development', 'test', 'staging', 'production']);

const envSchema = z
  .object({
    NODE_ENV: nodeEnvSchema.default('development'),

    PORT: z.coerce.number().int().min(1).max(65535).default(4000),

    // Origin allowed to call this API with credentials.
    FRONTEND_ORIGIN: z.url(),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // Only used by the test suite. Never used by the running server.
    TEST_DATABASE_URL: z.string().min(1).optional(),

    // Secret used to sign CSRF tokens. Must be long and random in production.
    CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),

    // Storage. Only the local provider exists in Phase 1.
    STORAGE_PROVIDER: z.enum(['local']).default('local'),
    STORAGE_LOCAL_PATH: z.string().min(1).default('./storage'),

    MAX_FILE_SIZE_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(10 * 1024 * 1024),
    ALLOWED_FILE_MIME_TYPES: z.string().default('image/jpeg,image/png,image/webp,application/pdf'),

    // PDF rendering. Only the stub exists in Phase 1; Phase 5 adds a real renderer.
    PDF_RENDERER: z.enum(['stub']).default('stub'),

    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  })
  .transform((value) => ({
    ...value,
    isProduction: value.NODE_ENV === 'production',
    isTest: value.NODE_ENV === 'test',
    isDevelopment: value.NODE_ENV === 'development',
    allowedFileMimeTypes: value.ALLOWED_FILE_MIME_TYPES.split(',')
      .map((type) => type.trim())
      .filter((type) => type.length > 0),
  }));

export type Env = z.infer<typeof envSchema>;

/**
 * Parses and validates an environment record.
 *
 * Exported separately from the module-level singleton so it can be unit tested
 * without mutating `process.env`.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}

let cachedEnv: Env | undefined;

/**
 * Returns the validated environment, parsing it on first use.
 */
export function getEnv(): Env {
  cachedEnv ??= parseEnv();
  return cachedEnv;
}

/**
 * Clears the cached environment. Test-only.
 */
export function resetEnvCache(): void {
  cachedEnv = undefined;
}
