/**
 * Purchase types.
 *
 * See business-blueprint section 2.16 and docs/implementation-plan.md
 * Phase 7C.
 */

export interface PurchaseItem {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  measurementUnitId: string;
  measurementUnitName: string;
  measurementUnitSymbol: string | null;
  /** Decimal string. Total volume (m³) for Pumice; plain quantity otherwise. */
  quantity: string;
  /** Decimal string. Rate per cubic metre for Pumice; plain unit cost otherwise. */
  unitCost: string;
  /** Decimal string. `quantity × unitCost`. */
  lineTotal: string;
  /** Pumice only — null for every other raw material. */
  lengthMetres: string | null;
  widthMetres: string | null;
  heightMetres: string | null;
  numberOfLoads: number | null;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  reference: string | null;
  /** Decimal string. Sum of all item line totals. */
  totalCost: string;
  itemCount: number;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseDetail extends Omit<Purchase, 'itemCount'> {
  items: PurchaseItem[];
}

export interface PurchaseFilters {
  page: number;
  pageSize: number;
  search?: string;
  supplierId?: string;
  rawMaterialId?: string;
}

/** Matches the raw material by name — the same identification Pumice gets on the backend. */
export function isPumiceMaterial(rawMaterialName: string | undefined): boolean {
  return rawMaterialName?.trim().toLowerCase() === 'pumice';
}
