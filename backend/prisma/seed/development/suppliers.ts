import type { DbClient } from '../../../src/shared/database/transaction.js';
import { normalizeEmail, normalizePhone } from '../../../src/shared/utils/normalize.js';

/**
 * Demo suppliers. Fixed phone numbers make the seed idempotent — see
 * customers.ts for the same pattern. See business-blueprint section 4.1.
 */
const DEMO_SUPPLIERS: { name: string; phone: string; email?: string; address?: string }[] = [
  {
    name: 'Demo Supplier — Rift Valley Cement',
    phone: '0700000301',
    email: 'demo.riftvalley@example.test',
    address: 'Industrial Area, Nairobi',
  },
  { name: 'Demo Supplier — Coastal Aggregates', phone: '0700000302', address: 'Mombasa Road' },
];

export interface SeedSuppliersResult {
  created: number;
  skipped: number;
}

export async function seedDemoSuppliers(client: DbClient): Promise<SeedSuppliersResult> {
  let created = 0;
  let skipped = 0;

  for (const demo of DEMO_SUPPLIERS) {
    const phoneNormalized = normalizePhone(demo.phone);
    const existing = await client.supplier.findUnique({ where: { phoneNormalized } });

    if (existing) {
      skipped += 1;
      continue;
    }

    await client.supplier.create({
      data: {
        name: demo.name,
        phone: demo.phone,
        phoneNormalized,
        email: demo.email ?? null,
        emailNormalized: demo.email ? normalizeEmail(demo.email) : null,
        address: demo.address ?? null,
      },
    });
    created += 1;
  }

  return { created, skipped };
}
