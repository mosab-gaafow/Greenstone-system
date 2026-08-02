import type { DbClient } from '../../../src/shared/database/transaction.js';
import {
  normalizeEmail,
  normalizeForComparison,
  normalizePhone,
} from '../../../src/shared/utils/normalize.js';

/**
 * Demo customers.
 *
 * Fixed phone numbers so the seed is idempotent — re-running it finds the
 * same normalised phone and skips, rather than creating duplicates. The
 * "Demo " prefix makes every row easy to spot and delete by hand.
 *
 * See business-blueprint section 4.1.
 */
const DEMO_CUSTOMERS: { name: string; phone: string; email?: string; site: string }[] = [
  { name: 'Demo Customer — Kamau Contractors', phone: '0700000001', site: 'Kiambu Road site' },
  {
    name: 'Demo Customer — Otieno Builders',
    phone: '0700000002',
    email: 'demo.otieno@example.test',
    site: 'Ruiru site',
  },
  { name: 'Demo Customer — Wanjiru Estates', phone: '0700000003', site: 'Ngong Road site' },
];

export interface SeedCustomersResult {
  created: number;
  skipped: number;
}

export async function seedDemoCustomers(client: DbClient): Promise<SeedCustomersResult> {
  let created = 0;
  let skipped = 0;

  for (const demo of DEMO_CUSTOMERS) {
    const phoneNormalized = normalizePhone(demo.phone);
    const existing = await client.customer.findUnique({ where: { phoneNormalized } });

    if (existing) {
      skipped += 1;
      continue;
    }

    const customer = await client.customer.create({
      data: {
        name: demo.name,
        phone: demo.phone,
        phoneNormalized,
        email: demo.email ?? null,
        emailNormalized: demo.email ? normalizeEmail(demo.email) : null,
      },
    });

    await client.customerAddress.create({
      data: {
        customerId: customer.id,
        label: demo.site,
        labelNormalized: normalizeForComparison(demo.site),
        addressLine: `${demo.site}, demo data`,
      },
    });

    created += 1;
  }

  return { created, skipped };
}
