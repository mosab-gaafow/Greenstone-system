import process from 'node:process';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '../../src/config/env.js';
import { resetRedisClient } from '../../src/shared/cache/redis.client.js';

/**
 * Cache behaviour.
 *
 * The point of most of these tests is not that caching works — it is that
 * **nothing breaks when it does not**. Redis is an optional performance layer,
 * so a disabled, unreachable, or slow cache must still produce correct data.
 *
 * The modules are imported dynamically after the environment is set, because
 * the cache configuration is read when the module is first loaded.
 */

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379';
/** A port nothing is listening on, used to simulate an outage. */
const DEAD_REDIS_URL = 'redis://127.0.0.1:6399';

type CacheModule = typeof import('../../src/shared/cache/cache.service.js');
type KeysModule = typeof import('../../src/shared/cache/cache-keys.js');
type ClientModule = typeof import('../../src/shared/cache/redis.client.js');

/**
 * Loads a fresh cache module with the given REDIS_URL.
 *
 * `resetModules` matters: the configuration is captured at import time, so a
 * cached module would keep the previous environment.
 */
async function loadCache(redisUrl: string | undefined): Promise<{
  cache: CacheModule['cache'];
  keys: KeysModule;
  client: ClientModule;
}> {
  if (redisUrl === undefined) {
    delete process.env['REDIS_URL'];
  } else {
    process.env['REDIS_URL'] = redisUrl;
  }

  resetRedisClient();
  resetEnvCache();
  vi.resetModules();

  const cacheModule = (await import('../../src/shared/cache/cache.service.js')) as CacheModule;
  const keys = (await import('../../src/shared/cache/cache-keys.js')) as KeysModule;
  const client = (await import('../../src/shared/cache/redis.client.js')) as ClientModule;

  // The connection is created lazily on first use, exactly as it is in
  // server.ts. Without this the client would never exist and the cache would
  // look permanently degraded.
  client.getRedisClient();

  return { cache: cacheModule.cache, keys, client };
}

/** Waits until the client reports ready, or gives up. */
async function waitForReady(client: ClientModule, timeoutMs = 3_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (client.isRedisReady()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return false;
}

const originalRedisUrl = process.env['REDIS_URL'];

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  if (originalRedisUrl === undefined) {
    delete process.env['REDIS_URL'];
  } else {
    process.env['REDIS_URL'] = originalRedisUrl;
  }
  resetRedisClient();
  resetEnvCache();
});

describe('cache disabled (REDIS_URL empty)', () => {
  it('reports itself as disabled', async () => {
    const { cache } = await loadCache(undefined);
    expect(cache.status()).toBe('disabled');
  });

  it('still returns correct data, straight from the loader', async () => {
    const { cache, keys } = await loadCache(undefined);
    const key = keys.buildCacheKey({ module: 'test', resource: 'disabled', identifier: 'a' });

    const value = await cache.getOrSet(key, 60, () => Promise.resolve({ from: 'mysql' }));

    expect(value).toEqual({ from: 'mysql' });
  });

  it('runs the loader every time, because nothing is stored', async () => {
    const { cache, keys } = await loadCache(undefined);
    const key = keys.buildCacheKey({ module: 'test', resource: 'disabled', identifier: 'b' });
    const loader = vi.fn(() => Promise.resolve('value'));

    await cache.getOrSet(key, 60, loader);
    await cache.getOrSet(key, 60, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does not throw on get, set, del or delByPrefix', async () => {
    const { cache, keys } = await loadCache(undefined);
    const key = keys.buildCacheKey({ module: 'test', resource: 'disabled', identifier: 'c' });

    await expect(cache.get(key)).resolves.toBeNull();
    await expect(cache.set(key, 'x', 60)).resolves.toBeUndefined();
    await expect(cache.del(key)).resolves.toBeUndefined();
    await expect(cache.delByPrefix(keys.buildCacheKeyPrefix('test'))).resolves.toBeUndefined();
  });
});

describe('cache unavailable (Redis configured but down)', () => {
  it('reports degraded rather than failing', async () => {
    const { cache } = await loadCache(DEAD_REDIS_URL);
    // Give the connection a moment to fail.
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(cache.status()).toBe('degraded');
  });

  it('falls back to the loader and returns correct data', async () => {
    const { cache, keys } = await loadCache(DEAD_REDIS_URL);
    const key = keys.buildCacheKey({ module: 'test', resource: 'down', identifier: 'a' });

    const value = await cache.getOrSet(key, 60, () => Promise.resolve({ from: 'mysql' }));

    expect(value).toEqual({ from: 'mysql' });
  });

  it('never throws from any operation', async () => {
    const { cache, keys } = await loadCache(DEAD_REDIS_URL);
    const key = keys.buildCacheKey({ module: 'test', resource: 'down', identifier: 'b' });

    await expect(cache.get(key)).resolves.toBeNull();
    await expect(cache.set(key, 'x', 60)).resolves.toBeUndefined();
    await expect(cache.del(key)).resolves.toBeUndefined();
    await expect(cache.delByPrefix(keys.buildCacheKeyPrefix('test'))).resolves.toBeUndefined();
  });

  it('does not stall a request waiting for a dead Redis', async () => {
    const { cache, keys } = await loadCache(DEAD_REDIS_URL);
    const key = keys.buildCacheKey({ module: 'test', resource: 'down', identifier: 'c' });

    const startedAt = Date.now();
    await cache.getOrSet(key, 60, () => Promise.resolve('value'));

    // The command timeout is 250ms; anything near a socket timeout would mean
    // the offline queue was still active.
    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });
});

describe('cache available', () => {
  let cache: CacheModule['cache'];
  let keys: KeysModule;
  let client: ClientModule;
  let ready = false;

  beforeEach(async () => {
    ({ cache, keys, client } = await loadCache(REDIS_URL));
    ready = await waitForReady(client);

    if (ready) {
      await cache.delByPrefix(keys.buildEnvironmentPrefix());
    }
  });

  afterAll(async () => {
    await client?.disconnectRedis();
  });

  it('reports ok', () => {
    expect(ready).toBe(true);
    expect(cache.status()).toBe('ok');
  });

  it('misses on the first read and runs the loader once', async () => {
    const key = keys.buildCacheKey({ module: 'test', resource: 'hit', identifier: 'a' });
    const loader = vi.fn(() => Promise.resolve({ value: 1 }));

    const result = await cache.getOrSet(key, 60, loader);

    expect(result).toEqual({ value: 1 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('hits on the second read without running the loader', async () => {
    const key = keys.buildCacheKey({ module: 'test', resource: 'hit', identifier: 'b' });
    const loader = vi.fn(() => Promise.resolve({ value: 2 }));

    await cache.getOrSet(key, 60, loader);
    const second = await cache.getOrSet(key, 60, loader);

    expect(second).toEqual({ value: 2 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('round-trips objects, arrays and primitives', async () => {
    const key = keys.buildCacheKey({ module: 'test', resource: 'types', identifier: 'a' });

    await cache.set(key, { list: [1, 2, 3], nested: { ok: true } }, 60);

    expect(await cache.get(key)).toEqual({ list: [1, 2, 3], nested: { ok: true } });
  });

  it('expires a value once its TTL passes', async () => {
    const key = keys.buildCacheKey({ module: 'test', resource: 'ttl', identifier: 'a' });

    await cache.set(key, 'short-lived', 1);
    expect(await cache.get(key)).toBe('short-lived');

    await new Promise((resolve) => setTimeout(resolve, 1_200));

    expect(await cache.get(key)).toBeNull();
  });

  it('refuses to store a value without a positive TTL', async () => {
    const key = keys.buildCacheKey({ module: 'test', resource: 'ttl', identifier: 'b' });

    // There must be no way to create a permanent cache record.
    await expect(cache.set(key, 'forever', 0)).rejects.toThrow(/TTL/);
    await expect(cache.set(key, 'forever', -1)).rejects.toThrow(/TTL/);
    await expect(cache.set(key, 'forever', 1.5)).rejects.toThrow(/TTL/);
  });

  it('invalidates a single key', async () => {
    const key = keys.buildCacheKey({ module: 'test', resource: 'invalidate', identifier: 'a' });
    const loader = vi.fn(() => Promise.resolve('value'));

    await cache.getOrSet(key, 60, loader);
    await cache.del(key);
    await cache.getOrSet(key, 60, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('invalidates every key under a prefix', async () => {
    const a = keys.buildCacheKey({ module: 'test', resource: 'group', identifier: 'a' });
    const b = keys.buildCacheKey({ module: 'test', resource: 'group', identifier: 'b' });

    await cache.set(a, 1, 60);
    await cache.set(b, 2, 60);

    await cache.delByPrefix(keys.buildCacheKeyPrefix('test', 'group'));

    expect(await cache.get(a)).toBeNull();
    expect(await cache.get(b)).toBeNull();
  });

  it('leaves other modules alone when invalidating a prefix', async () => {
    const mine = keys.buildCacheKey({ module: 'test', resource: 'scoped', identifier: 'a' });
    const other = keys.buildCacheKey({ module: 'unrelated', resource: 'scoped', identifier: 'a' });

    await cache.set(mine, 1, 60);
    await cache.set(other, 2, 60);

    await cache.delByPrefix(keys.buildCacheKeyPrefix('test'));

    expect(await cache.get(mine)).toBeNull();
    expect(await cache.get(other)).toBe(2);

    await cache.del(other);
  });

  it('misses entries written under an older key version', async () => {
    const key = keys.buildCacheKey({ module: 'test', resource: 'version', identifier: 'a' });
    await cache.set(key, 'current', 60);

    // A version bump changes the namespace, so old entries become unreachable
    // rather than being served with the wrong shape.
    const older = key.replace(':v1:', ':v0:');
    expect(await cache.get(older)).toBeNull();
  });

  it('discards a value that cannot be parsed', async () => {
    const key = keys.buildCacheKey({ module: 'test', resource: 'corrupt', identifier: 'a' });
    const raw = client.getRedisClient();

    // Write something that is not JSON, as a stray writer might.
    await raw?.set(key, '{not valid json');

    expect(await cache.get(key)).toBeNull();
  });
});
