/**
 * Development demo seed.
 *
 * Creates clearly marked demo records — every name is prefixed "Demo " —
 * for the master-data modules that exist so far and have none: Customers,
 * Employees, Drivers, Vehicles, Suppliers. Products are not seeded here —
 * the confirmed initial product definitions are real system data, created by
 * the production seed instead.
 *
 * Every demo record uses a fixed identifying value (phone, national ID, or
 * registration number), so re-running this script finds the existing row and
 * skips it rather than creating duplicates.
 *
 * Must never run against a production database — see the guard below and
 * business-blueprint section 4.1.
 */

// Must stay first: it populates the environment before any module that reads
// configuration at import time is evaluated.
import '../../../src/config/load-env.js';

import process from 'node:process';
import { getEnv } from '../../../src/config/env.js';
import { disconnectPrisma, getPrisma } from '../../../src/shared/database/prisma.js';
import { seedDemoCustomers } from './customers.js';
import { seedDemoEmployees } from './employees.js';
import { seedDemoDrivers } from './drivers.js';
import { seedDemoVehicles } from './vehicles.js';
import { seedDemoSuppliers } from './suppliers.js';

/**
 * Refuses to run against anything that looks like production.
 *
 * `NODE_ENV=production` is the authoritative signal the rest of the app
 * already uses (see src/config/env.ts). The database-name check is a second,
 * independent guard, the same defence-in-depth approach
 * tests/setup/global-setup.ts uses for the test database.
 */
function assertNotProduction(): void {
  const env = getEnv();

  if (env.isProduction) {
    throw new Error('Refusing to run the development demo seed with NODE_ENV=production.');
  }

  const databaseUrl = process.env['DATABASE_URL'];
  const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, '') : '';

  if (databaseName.toLowerCase().includes('prod')) {
    throw new Error(
      `Refusing to run the development demo seed against "${databaseName}": the database name looks like production.`,
    );
  }
}

async function main(): Promise<void> {
  assertNotProduction();

  const prisma = getPrisma();

  const customers = await seedDemoCustomers(prisma);
  const employees = await seedDemoEmployees(prisma);
  const drivers = await seedDemoDrivers(prisma);
  const vehicles = await seedDemoVehicles(prisma);
  const suppliers = await seedDemoSuppliers(prisma);

  console.log('Development demo seed complete.');
  console.log(`  Customers: ${String(customers.created)} created, ${String(customers.skipped)} already present.`);
  console.log(`  Employees: ${String(employees.created)} created, ${String(employees.skipped)} already present.`);
  console.log(`  Drivers: ${String(drivers.created)} created, ${String(drivers.skipped)} already present.`);
  console.log(`  Vehicles: ${String(vehicles.created)} created, ${String(vehicles.skipped)} already present.`);
  console.log(`  Suppliers: ${String(suppliers.created)} created, ${String(suppliers.skipped)} already present.`);
}

void main()
  .catch((error: unknown) => {
    console.error('Development demo seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectPrisma();
  });
