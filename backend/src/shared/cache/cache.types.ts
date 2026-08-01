/**
 * Cache contract.
 *
 * Redis is an optional performance layer. MySQL is the source of truth.
 *
 * Nothing in this file can throw. Every operation returns a safe fallback when
 * the cache is disabled, unreachable, or slow, so a cache problem can never
 * become a business-request problem.
 */

/**
 * Reported by the readiness endpoint.
 *
 * `degraded` means Redis is configured but unavailable. The application is
 * still ready, because it can serve every request from MySQL.
 */
export type CacheStatus = 'ok' | 'degraded' | 'disabled';

export interface CacheStore {
  /** Returns the cached value, or null on a miss, an error, or when disabled. */
  get<TValue>(key: string): Promise<TValue | null>;

  /**
   * Stores a value.
   *
   * `ttlSeconds` is required. There is no way to write a value without an
   * expiry, so a permanent cache record cannot be created by accident.
   */
  set<TValue>(key: string, value: TValue, ttlSeconds: number): Promise<void>;

  /** Removes one key. */
  del(key: string): Promise<void>;

  /** Removes every key under a prefix. */
  delByPrefix(prefix: string): Promise<void>;

  /**
   * Cache-aside read.
   *
   * Checks the cache, runs `loader` against MySQL on a miss, stores the result
   * with a TTL, and returns it. When the cache is unavailable the loader still
   * runs, so the caller always receives correct data.
   */
  getOrSet<TValue>(key: string, ttlSeconds: number, loader: () => Promise<TValue>): Promise<TValue>;

  status(): CacheStatus;
}
