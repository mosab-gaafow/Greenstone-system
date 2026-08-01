import { getEnv } from '../config/env.js';
import { checkDatabaseConnection } from '../shared/database/prisma.js';
import { getStorageProvider } from '../shared/storage/storage.service.js';

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

  const allPassed = [database, configuration, storage].every((check) => check === 'ok');

  return {
    status: allPassed ? 'ready' : 'not_ready',
    checks: { database, configuration, storage },
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
