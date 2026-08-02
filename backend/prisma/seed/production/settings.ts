import type { DbClient } from '../../../src/shared/database/transaction.js';
import { ensureSettingsRow } from '../../../src/modules/settings/settings.repository.js';

/**
 * The one required company-settings row.
 *
 * "Required system settings" is explicitly production-seed scope (business-
 * blueprint section 4.3). Real company data is entered later, during
 * production setup (section 9.5) — this only guarantees the singleton row
 * exists so the rest of the system never has to handle a missing one.
 *
 * Idempotent: `ensureSettingsRow` never overwrites an existing row.
 */
export interface SeedSettingsResult {
  created: boolean;
}

export async function seedDefaultSettings(client: DbClient): Promise<SeedSettingsResult> {
  const existed = (await client.companySettings.count()) > 0;

  await ensureSettingsRow(client);

  return { created: !existed };
}
