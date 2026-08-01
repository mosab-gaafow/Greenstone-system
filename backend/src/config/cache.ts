import { getEnv } from './env.js';

/**
 * Cache configuration.
 *
 * Redis is an optional performance layer. MySQL is always the source of truth.
 * See docs/technical-blueprint.md section 4A.
 */

export interface CacheConfig {
  /** False when REDIS_URL is empty. Every read then goes to MySQL. */
  enabled: boolean;
  url: string | undefined;
  /** Fallback TTL in seconds. Every cached value must have one. */
  defaultTtlSeconds: number;
  /** Environment segment of the key namespace. */
  environment: string;
  /**
   * Milliseconds a single cache command may take before it is abandoned.
   *
   * A slow Redis must degrade to a cache miss rather than hold up a business
   * request, so the wait is deliberately short.
   */
  commandTimeoutMs: number;
}

/** Key namespace version. Raising it retires every existing key at once. */
export const CACHE_KEY_VERSION = 'v1';

/** Root namespace for every key this application writes. */
export const CACHE_KEY_ROOT = 'greenstone';

export function getCacheConfig(): CacheConfig {
  const env = getEnv();

  return {
    enabled: Boolean(env.REDIS_URL),
    url: env.REDIS_URL,
    defaultTtlSeconds: env.CACHE_DEFAULT_TTL_SECONDS,
    environment: env.NODE_ENV,
    commandTimeoutMs: 250,
  };
}
