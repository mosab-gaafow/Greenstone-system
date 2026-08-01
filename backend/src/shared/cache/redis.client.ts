import { createClient, type RedisClientType } from 'redis';
import { getCacheConfig } from '../../config/cache.js';
import { getLogger } from '../utils/logger.js';

/**
 * Redis connection.
 *
 * Three settings here exist specifically so a Redis problem can never become an
 * application problem:
 *
 * 1. An `error` listener is attached before anything else. node-redis is an
 *    EventEmitter, and an unhandled `error` event terminates the Node process —
 *    a brief network blip would take the backend down with it.
 *
 * 2. `disableOfflineQueue` is on. By default node-redis queues commands while
 *    disconnected and replays them once it reconnects, so a request could wait
 *    on a Redis that never comes back. Disabled, commands fail immediately and
 *    the cache service turns that into a miss.
 *
 * 3. The reconnect strategy backs off and never gives up, but reconnection
 *    happens in the background and no request ever waits for it.
 */

let client: RedisClientType | undefined;
/** True once a connection has succeeded at least once. */
let connectionAttempted = false;

function buildClient(url: string): RedisClientType {
  const logger = getLogger();

  const instance: RedisClientType = createClient({
    url,
    // Commands must fail fast rather than queue when Redis is unavailable.
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 1_000,
      reconnectStrategy: (retries: number) => {
        // Exponential backoff with jitter, capped at 10 seconds. Returning a
        // number rather than false means it keeps trying, so the cache recovers
        // on its own once Redis returns.
        const delay = Math.min(2 ** retries * 50, 10_000);
        return delay + Math.floor(Math.random() * 200);
      },
    },
  });

  // Must be attached, or an error event ends the process.
  instance.on('error', (error: unknown) => {
    // Logged at warn, not error: an unreachable cache is a degradation, not a
    // failure, and it must not read as an outage in the logs.
    logger.warn({ err: error }, 'Redis connection problem. Serving from MySQL.');
  });

  instance.on('ready', () => {
    logger.info('Redis connected.');
  });

  return instance;
}

/**
 * Returns the client, or undefined when caching is disabled.
 *
 * Connection is started in the background. Callers never await it, so a slow or
 * dead Redis cannot delay startup or a request.
 */
export function getRedisClient(): RedisClientType | undefined {
  const config = getCacheConfig();

  if (!config.enabled || !config.url) {
    return undefined;
  }

  if (!client) {
    client = buildClient(config.url);
  }

  if (!connectionAttempted) {
    connectionAttempted = true;
    client.connect().catch(() => {
      // Already reported by the error listener. Reconnection continues in the
      // background; every read falls back to MySQL until it succeeds.
    });
  }

  return client;
}

/** True when the client exists and is ready to accept commands. */
export function isRedisReady(): boolean {
  return client?.isReady === true;
}

export async function disconnectRedis(): Promise<void> {
  if (!client) {
    return;
  }

  const instance = client;
  client = undefined;
  connectionAttempted = false;

  try {
    await instance.close();
  } catch {
    // Shutting down. A failure to close cleanly changes nothing.
  }
}

/** Clears the cached client. Test-only. */
export function resetRedisClient(): void {
  client = undefined;
  connectionAttempted = false;
}
