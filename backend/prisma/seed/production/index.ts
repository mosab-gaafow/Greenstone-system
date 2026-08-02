/**
 * Production system seed.
 *
 * Creates only required system data. It must never create demo customers,
 * employees, suppliers, drivers, vehicles, balances, stock, payments or
 * expenses — see business-blueprint section 4.2.
 *
 * Safe to run more than once: everything here is idempotent.
 *
 * Currently seeds the confirmed initial product definitions and the required
 * default company-settings row (blank until filled in during production
 * setup). Roles and permissions need no rows, because they live in code as
 * Better Auth access control. The initial Super Admin is created separately
 * and interactively by `pnpm --filter backend create-super-admin`, so no
 * password ever passes through a seed.
 */

// Must stay first: it populates the environment before any module that reads
// configuration at import time is evaluated.
import '../../../src/config/load-env.js';

import process from 'node:process';
import { disconnectPrisma, getPrisma } from '../../../src/shared/database/prisma.js';
import { seedInitialProducts } from './products.js';
import { seedDefaultSettings } from './settings.js';

async function main(): Promise<void> {
  const prisma = getPrisma();

  const products = await seedInitialProducts(prisma);
  const settings = await seedDefaultSettings(prisma);

  console.log('Production seed complete.');
  console.log(
    `  Products: ${String(products.created)} created, ${String(products.skipped)} already present.`,
  );
  console.log(`  Settings: ${settings.created ? 'default row created' : 'already present'}.`);
}

void main()
  .catch((error: unknown) => {
    console.error('Production seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectPrisma();
  });
