import { getEnv } from '../config/env.js';
import { checkDatabaseConnection } from '../shared/database/prisma.js';
import { getStorageProvider } from '../shared/storage/storage.service.js';
import { cache } from '../shared/cache/cache.service.js';
import type { CacheStatus } from '../shared/cache/cache.types.js';

/**
 * Liveness and readiness checks.
 *
 * Health output must never expose secrets, connection strings or versions of
 * internal components. See docs/technical-blueprint.md section 13.5.
 */

export interface LivenessResult {
  status: 'ok';
  uptimeSeconds: number;
}

export type CheckStatus = 'ok' | 'failed';

export interface ReadinessResult {
  status: 'ready' | 'not_ready';
  checks: {
    database: CheckStatus;
    configuration: CheckStatus;
    storage: CheckStatus;
    /**
     * Informational only. Redis is a performance layer, so its state never
     * decides readiness.
     */
    cache: CacheStatus;
  };
}

/**
 * Liveness answers "is this process running". It must not touch the database,
 * otherwise a database outage would cause the process to be restarted instead of
 * simply removed from the load balancer.
 */
export function getLiveness(): LivenessResult {
  return {
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

/**
 * Readiness answers "can this process serve traffic".
 *
 * The cache is reported but deliberately excluded from the decision. Without
 * Redis the system still answers every request correctly, just more slowly, so
 * failing readiness would pull a working server out of rotation and turn a
 * minor degradation into an outage.
 */
export async function getReadiness(): Promise<ReadinessResult> {
  const [database, configuration, storage] = await Promise.all([
    runCheck(async () => {
      await checkDatabaseConnection();
    }),
    runCheck(async () => {
      getEnv();
      await Promise.resolve();
    }),
    runCheck(async () => {
      await getStorageProvider().healthCheck();
    }),
  ]);

  const required = [database, configuration, storage];
  const allPassed = required.every((check) => check === 'ok');

  return {
    status: allPassed ? 'ready' : 'not_ready',
    checks: { database, configuration, storage, cache: cache.status() },
  };
}

async function runCheck(check: () => Promise<void>): Promise<CheckStatus> {
  try {
    await check();
    return 'ok';
  } catch {
    return 'failed';
  }
}
