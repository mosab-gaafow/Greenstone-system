import { getCacheConfig } from '../../config/cache.js';
import { getLogger } from '../utils/logger.js';
import { getRedisClient, isRedisReady } from './redis.client.js';
import type { CacheStatus, CacheStore } from './cache.types.js';

/**
 * Cache service.
 *
 * Redis is an optional performance layer. **MySQL is always the source of
 * truth.** Losing Redis must not lose or corrupt any business information, and
 * must never fail a request.
 *
 * ## Never cache
 *
 * These are read from MySQL, inside the transaction that uses them, every time:
 *
 * - Better Auth sessions
 * - Passwords and authentication secrets
 * - Permissions used for final authorisation
 * - Customer credit status used during a transaction
 * - Customer balances
 * - Supplier balances
 * - Finished-stock availability during a transaction
 * - Raw-material availability during a transaction
 * - Stock reservations
 * - Document-number sequences
 * - Payment approval status
 * - Salary approval status
 * - Invoice balances
 * - Audit logs
 *
 * A cached figure may be shown on a screen. It must never be the value a
 * transaction acts on. See docs/technical-blueprint.md section 4A.
 */

/**
 * Runs a cache operation, converting any failure into a safe fallback.
 *
 * A cache command that hangs is as damaging as one that fails, so the call is
 * also raced against a short timeout.
 */
async function safely<TResult>(
  operation: string,
  fallback: TResult,
  run: () => Promise<TResult>,
): Promise<TResult> {
  const config = getCacheConfig();

  if (!config.enabled || !isRedisReady()) {
    return fallback;
  }

  let timer: NodeJS.Timeout | undefined;

  try {
    const timeout = new Promise<TResult>((resolve) => {
      timer = setTimeout(() => {
        getLogger().warn({ operation }, 'Cache command timed out. Serving from MySQL.');
        resolve(fallback);
      }, config.commandTimeoutMs);
    });

    return await Promise.race([run(), timeout]);
  } catch (error) {
    getLogger().warn({ err: error, operation }, 'Cache operation failed. Serving from MySQL.');
    return fallback;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function get<TValue>(key: string): Promise<TValue | null> {
  return safely<TValue | null>('get', null, async () => {
    const client = getRedisClient();

    if (!client) {
      return null;
    }

    const raw = await client.get(key);

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as TValue;
    } catch {
      // A value that will not parse is worse than no value. Drop it so the
      // next read repopulates from MySQL.
      getLogger().warn({ key }, 'Cached value could not be parsed. Discarding.');
      void del(key);
      return null;
    }
  });
}

async function set<TValue>(key: string, value: TValue, ttlSeconds: number): Promise<void> {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    // Rejected outright: a value without an expiry would live in Redis forever
    // and could outlast the record it came from.
    throw new Error(`Cache TTL must be a positive whole number of seconds, received ${ttlSeconds}`);
  }

  await safely('set', undefined, async () => {
    const client = getRedisClient();

    if (client) {
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    }
  });
}

async function del(key: string): Promise<void> {
  await safely('del', undefined, async () => {
    const client = getRedisClient();

    if (client) {
      await client.del(key);
    }
  });
}

/**
 * Removes every key under a prefix.
 *
 * Uses SCAN rather than KEYS, which would block the Redis server while it walks
 * the whole keyspace.
 */
async function delByPrefix(prefix: string): Promise<void> {
  await safely('delByPrefix', undefined, async () => {
    const client = getRedisClient();

    if (!client) {
      return;
    }

    const batch: string[] = [];

    for await (const keys of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 200 })) {
      batch.push(...(Array.isArray(keys) ? keys : [keys]));
    }

    if (batch.length > 0) {
      await client.del(batch);
    }
  });
}

/**
 * Cache-aside read.
 *
 * Check the cache, load from MySQL on a miss, store with a TTL, return.
 *
 * The loader always runs when the cache cannot answer, so the caller receives
 * correct data whether Redis is healthy, disabled, or unreachable.
 */
async function getOrSet<TValue>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<TValue>,
): Promise<TValue> {
  const cached = await get<TValue>(key);

  if (cached !== null) {
    return cached;
  }

  const value = await loader();

  // A failure to store must not fail the request that just loaded good data.
  await set(key, value, ttlSeconds);

  return value;
}

function status(): CacheStatus {
  if (!getCacheConfig().enabled) {
    return 'disabled';
  }

  return isRedisReady() ? 'ok' : 'degraded';
}

export const cache: CacheStore = {
  get,
  set,
  del,
  delByPrefix,
  getOrSet,
  status,
};

export { getCacheConfig };
