import type { DbClient } from '../../../src/shared/database/transaction.js';
import { normalizePhone, normalizeRegistration } from '../../../src/shared/utils/normalize.js';

/**
 * Demo vehicles. Fixed registration numbers make the seed idempotent — see
 * customers.ts for the same pattern. See business-blueprint section 4.1.
 *
 * Phase 6F: every vehicle requires a registered Vehicle Owner. `ownerPhone`
 * looks up the demo owner created by `seedDemoVehicleOwners`, which must run
 * first (see index.ts) — never invents an owner.
 */
const DEMO_VEHICLES: {
  registrationNumber: string;
  vehicleType: string;
  ownerPhone: string;
}[] = [
  { registrationNumber: 'KAA 000A', vehicleType: 'Flatbed truck', ownerPhone: '0700000301' },
  { registrationNumber: 'KAA 000B', vehicleType: 'Tipper truck', ownerPhone: '0700000301' },
];

export interface SeedVehiclesResult {
  created: number;
  skipped: number;
}

export async function seedDemoVehicles(client: DbClient): Promise<SeedVehiclesResult> {
  let created = 0;
  let skipped = 0;

  for (const demo of DEMO_VEHICLES) {
    const registrationNormalized = normalizeRegistration(demo.registrationNumber);
    const existing = await client.vehicle.findUnique({ where: { registrationNormalized } });

    if (existing) {
      skipped += 1;
      continue;
    }

    const owner = await client.vehicleOwner.findUnique({
      where: { phoneNormalized: normalizePhone(demo.ownerPhone) },
    });

    if (!owner) {
      console.warn(
        `Skipping demo vehicle ${demo.registrationNumber}: its demo owner (${demo.ownerPhone}) was not found. Run seedDemoVehicleOwners first.`,
      );
      continue;
    }

    await client.vehicle.create({
      data: {
        registrationNumber: demo.registrationNumber,
        registrationNormalized,
        vehicleType: demo.vehicleType,
        vehicleOwnerId: owner.id,
      },
    });
    created += 1;
  }

  return { created, skipped };
}
