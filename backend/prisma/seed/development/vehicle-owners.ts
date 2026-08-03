import type { DbClient } from '../../../src/shared/database/transaction.js';
import { normalizeNationalId, normalizePhone } from '../../../src/shared/utils/normalize.js';

/**
 * Demo vehicle owners. Fixed phone numbers make the seed idempotent — see
 * customers.ts for the same pattern. See business-blueprint section 4.1 and
 * docs/implementation-plan.md Phase 6F.
 *
 * Independent of Driver — a vehicle owner is a separate master-data record
 * even when the same real person is both; this seed creates no link between
 * the two, per the decision document section 10.
 */
const DEMO_VEHICLE_OWNERS: { name: string; phone: string; nationalId?: string }[] = [
  { name: 'Demo Vehicle Owner — Kamau Transporters', phone: '0700000301', nationalId: 'DEMO0101' },
  { name: 'Demo Vehicle Owner — Otieno Haulage', phone: '0700000302' },
];

export interface SeedVehicleOwnersResult {
  created: number;
  skipped: number;
}

export async function seedDemoVehicleOwners(client: DbClient): Promise<SeedVehicleOwnersResult> {
  let created = 0;
  let skipped = 0;

  for (const demo of DEMO_VEHICLE_OWNERS) {
    const phoneNormalized = normalizePhone(demo.phone);
    const existing = await client.vehicleOwner.findUnique({ where: { phoneNormalized } });

    if (existing) {
      skipped += 1;
      continue;
    }

    await client.vehicleOwner.create({
      data: {
        name: demo.name,
        phone: demo.phone,
        phoneNormalized,
        nationalId: demo.nationalId ?? null,
        nationalIdNormalized: demo.nationalId ? normalizeNationalId(demo.nationalId) : null,
      },
    });
    created += 1;
  }

  return { created, skipped };
}
