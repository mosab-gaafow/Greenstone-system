import { pino, type Logger } from 'pino';
import { getEnv } from '../../config/env.js';

/**
 * Structured application logger.
 *
 * Redaction is configured here rather than left to call sites, so that
 * "never log passwords, tokens or payment evidence" is enforced by the
 * transport itself.
 *
 * See docs/technical-blueprint.md section 11.5.
 */

const REDACTED_PATHS = [
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'set-cookie',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.accessToken',
  '*.refreshToken',
];

let cachedLogger: Logger | undefined;

export function getLogger(): Logger {
  if (!cachedLogger) {
    const env = getEnv();

    cachedLogger = pino({
      level: env.isTest ? 'silent' : env.LOG_LEVEL,
      redact: {
        paths: REDACTED_PATHS,
        censor: '[REDACTED]',
      },
      base: { service: 'greenstone-backend' },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  return cachedLogger;
}

/** Clears the cached logger. Test-only. */
export function resetLoggerCache(): void {
  cachedLogger = undefined;
}
