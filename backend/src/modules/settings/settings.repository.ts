import type { CompanySettings, Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type { UpdateCompanySettingsInput } from './settings.types.js';

/**
 * Company settings database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 *
 * `CompanySettings` is a singleton table: exactly one row, fixed at
 * `SETTINGS_ROW_ID`, so there is never a "which settings row" question and
 * never a create or delete endpoint.
 */

export type SettingsRow = CompanySettings;

export const SETTINGS_ROW_ID = 'company-settings';

export async function findSettings(client: DbClient = getPrisma()): Promise<SettingsRow | null> {
  return client.companySettings.findUnique({ where: { id: SETTINGS_ROW_ID } });
}

/**
 * Creates the singleton row with blank values if it does not already exist.
 *
 * Idempotent, so both the production seed and a defensive first read can call
 * it safely. Real company data is entered later, during production setup —
 * see business-blueprint section 9.5.
 */
export async function ensureSettingsRow(client: DbClient = getPrisma()): Promise<SettingsRow> {
  return client.companySettings.upsert({
    where: { id: SETTINGS_ROW_ID },
    create: { id: SETTINGS_ROW_ID },
    update: {},
  });
}

export async function updateSettings(
  input: UpdateCompanySettingsInput,
  client: DbClient = getPrisma(),
): Promise<SettingsRow> {
  const data: Prisma.CompanySettingsUpdateInput = {};

  if (input.companyName !== undefined) {
    data.companyName = input.companyName;
  }
  if (input.address !== undefined) {
    data.address = input.address;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
  }
  if (input.email !== undefined) {
    data.email = input.email;
  }
  if (input.paymentDetails !== undefined) {
    data.paymentDetails = input.paymentDetails;
  }
  if (input.footerNotes !== undefined) {
    data.footerNotes = input.footerNotes;
  }

  return client.companySettings.update({ where: { id: SETTINGS_ROW_ID }, data });
}
