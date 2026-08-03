import type { DbClient } from '../../../src/shared/database/transaction.js';
import {
  findMeasurementUnitByName,
  insertMeasurementUnit,
} from '../../../src/modules/measurement-units/measurement-units.repository.js';
import {
  findRawMaterialByName,
  insertRawMaterial,
} from '../../../src/modules/raw-materials/raw-materials.repository.js';

/**
 * Confirmed measurement units and raw materials (business-blueprint sections
 * 2.12–2.13; docs/decisions/business-workflow-update-2026-08-02.md sections
 * 8, 9, and 14). These are approved system data, not demo data — the same
 * reasoning `products.ts` already applies to the confirmed initial product
 * definitions — so they belong in the production seed rather than the
 * development demo seed. See docs/implementation-plan.md Phase 7B.
 *
 * Reorder levels are left unset (business-blueprint section 2.14 — optional,
 * may be entered later by an authorised user). No opening stock quantity is
 * set here either — every raw material still starts at a zero balance
 * (`raw-materials.repository.ts`'s `insertRawMaterial`), and a real opening
 * quantity is entered later, during production setup, the same way
 * `settings.ts` leaves company details blank for the same reason.
 *
 * Do not add a raw material or unit here that is not approved.
 */
export const INITIAL_MEASUREMENT_UNITS: { name: string }[] = [
  { name: 'Sack' },
  { name: 'Cubic Metre' },
  { name: 'Tonne' },
];

export const INITIAL_RAW_MATERIALS: { name: string; measurementUnitName: string }[] = [
  { name: 'Cement', measurementUnitName: 'Sack' },
  { name: 'Dust', measurementUnitName: 'Tonne' },
  { name: 'Pumice', measurementUnitName: 'Cubic Metre' },
];

export interface SeedRawMaterialReferenceDataResult {
  measurementUnits: { created: number; skipped: number };
  rawMaterials: { created: number; skipped: number };
}

/**
 * Creates any approved measurement unit or raw material that does not
 * already exist. Idempotent, and deliberately never updates an existing row
 * — the same "never undo a deliberate later change" rule
 * `seedInitialProducts` already follows.
 */
export async function seedRawMaterialReferenceData(
  client: DbClient,
): Promise<SeedRawMaterialReferenceDataResult> {
  let unitsCreated = 0;
  let unitsSkipped = 0;

  for (const unit of INITIAL_MEASUREMENT_UNITS) {
    const existing = await findMeasurementUnitByName(unit.name, client);

    if (existing) {
      unitsSkipped += 1;
      continue;
    }

    await insertMeasurementUnit(unit, client);
    unitsCreated += 1;
  }

  let materialsCreated = 0;
  let materialsSkipped = 0;

  for (const material of INITIAL_RAW_MATERIALS) {
    const existing = await findRawMaterialByName(material.name, client);

    if (existing) {
      materialsSkipped += 1;
      continue;
    }

    const unit = await findMeasurementUnitByName(material.measurementUnitName, client);

    if (!unit) {
      throw new Error(
        `Measurement unit "${material.measurementUnitName}" was not found while seeding "${material.name}".`,
      );
    }

    await insertRawMaterial({ name: material.name, measurementUnitId: unit.id }, client);
    materialsCreated += 1;
  }

  return {
    measurementUnits: { created: unitsCreated, skipped: unitsSkipped },
    rawMaterials: { created: materialsCreated, skipped: materialsSkipped },
  };
}
