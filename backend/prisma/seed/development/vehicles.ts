import { Prisma } from '../../../src/generated/prisma/client.js';
import type { DbClient } from '../../../src/shared/database/transaction.js';
import { normalizeRegistration } from '../../../src/modules/vehicles/vehicles.repository.js';

/**
 * Demo vehicles. Fixed registration numbers make the seed idempotent — see
 * customers.ts for the same pattern. See business-blueprint section 4.1.
 *
 * `DEMO_CALCULATION_FACTOR` mirrors `DEFAULT_CALCULATION_FACTOR` in
 * vehicles.service.ts (1100) — kept as a separate constant because seed
 * scripts write rows directly, the same way production/products.ts does, not
 * through the service layer.
 */
const DEMO_CALCULATION_FACTOR = 1100;

const DEMO_VEHICLES: {
  registrationNumber: string;
  vehicleType: string;
  truckLengthM: string;
  truckWidthM: string;
  truckHeightM: string;
}[] = [
  {
    registrationNumber: 'KAA 000A',
    vehicleType: 'Flatbed truck',
    truckLengthM: '6.00',
    truckWidthM: '2.20',
    truckHeightM: '1.50',
  },
  {
    registrationNumber: 'KAA 000B',
    vehicleType: 'Tipper truck',
    truckLengthM: '4.50',
    truckWidthM: '2.00',
    truckHeightM: '1.20',
  },
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

    const factor = new Prisma.Decimal(DEMO_CALCULATION_FACTOR);
    const calculatedLoadKg = new Prisma.Decimal(demo.truckLengthM)
      .mul(demo.truckWidthM)
      .mul(demo.truckHeightM)
      .mul(factor);

    await client.vehicle.create({
      data: {
        registrationNumber: demo.registrationNumber,
        registrationNormalized,
        vehicleType: demo.vehicleType,
        truckLengthM: demo.truckLengthM,
        truckWidthM: demo.truckWidthM,
        truckHeightM: demo.truckHeightM,
        calculationFactor: factor,
        calculatedLoadKg,
        calculatedLoadTonnes: calculatedLoadKg.div(1000),
      },
    });
    created += 1;
  }

  return { created, skipped };
}
