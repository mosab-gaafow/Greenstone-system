import type { DbClient } from '../../../src/shared/database/transaction.js';
import { normalizeNationalId } from '../../../src/modules/drivers/drivers.repository.js';

/**
 * Demo drivers. Fixed national ID values make the seed idempotent — see
 * customers.ts for the same pattern. See business-blueprint section 4.1.
 *
 * Independent of Employee, per docs/implementation-plan.md Phase 4C — a
 * driver is never automatically a Greenstone employee.
 */
const DEMO_DRIVERS: { name: string; phone: string; nationalId: string }[] = [
  { name: 'Demo Driver — Mwangi Karanja', phone: '0700000201', nationalId: 'DEMO0001' },
  { name: 'Demo Driver — Hassan Abdi', phone: '0700000202', nationalId: 'DEMO0002' },
];

export interface SeedDriversResult {
  created: number;
  skipped: number;
}

export async function seedDemoDrivers(client: DbClient): Promise<SeedDriversResult> {
  let created = 0;
  let skipped = 0;

  for (const demo of DEMO_DRIVERS) {
    const nationalIdNormalized = normalizeNationalId(demo.nationalId);
    const existing = await client.driver.findUnique({ where: { nationalIdNormalized } });

    if (existing) {
      skipped += 1;
      continue;
    }

    await client.driver.create({
      data: {
        name: demo.name,
        phone: demo.phone,
        nationalId: demo.nationalId,
        nationalIdNormalized,
      },
    });
    created += 1;
  }

  return { created, skipped };
}
