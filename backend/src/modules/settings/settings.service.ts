import { ensureSettingsRow, updateSettings, type SettingsRow } from './settings.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import type { CompanySettingsSummary, UpdateCompanySettingsInput } from './settings.types.js';

/**
 * Company settings business logic.
 *
 * A singleton: `getSettings` never returns "not found" — it creates the row
 * with blank values on first read if the production seed has not run yet, so
 * the rest of the system never has to handle a missing settings row.
 */

const AUDIT_MODULE = 'settings';
const CACHE_MODULE = 'settings';
const TTL_SECONDS = 300;

export async function getSettings(): Promise<CompanySettingsSummary> {
  const key = buildCacheKey({ module: CACHE_MODULE, resource: 'singleton', identifier: 'current' });

  return cache.getOrSet(key, TTL_SECONDS, async () => toSummary(await ensureSettingsRow()));
}

export async function editSettings(
  input: UpdateCompanySettingsInput,
  context: RequestContext,
): Promise<CompanySettingsSummary> {
  const existing = await ensureSettingsRow();

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    await ensureSettingsRow(tx);
    const settings = await updateSettings(input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_SETTINGS',
      module: AUDIT_MODULE,
      entityType: 'CompanySettings',
      entityId: settings.id,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(settings),
    });

    return settings;
  });

  await invalidateSettingsCache();

  return toSummary(updated);
}

async function invalidateSettingsCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function toSummary(row: SettingsRow): CompanySettingsSummary {
  return {
    companyName: row.companyName,
    address: row.address,
    phone: row.phone,
    email: row.email,
    paymentDetails: row.paymentDetails,
    footerNotes: row.footerNotes,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: SettingsRow): Record<string, unknown> {
  return {
    companyName: row.companyName,
    address: row.address,
    phone: row.phone,
    email: row.email,
    paymentDetails: row.paymentDetails,
    footerNotes: row.footerNotes,
  };
}
