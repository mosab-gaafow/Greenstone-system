/**
 * Purchase module types.
 *
 * See business-blueprint section 2.16 and docs/implementation-plan.md
 * Phase 7C.
 *
 * A Purchase Item's `quantity`/`unitCost`/`lineTotal` are generic for every
 * raw material. For Pumice, `quantity` holds the computed total volume and
 * `unitCost` holds the rate per cubic metre — deliberately reused rather
 * than duplicated, so `lineTotal = quantity × unitCost` holds as one
 * invariant everywhere. `lengthMetres`/`widthMetres`/`heightMetres`/
 * `numberOfLoads`/`ratePerCubicMetre` are Pumice-only inputs with no generic
 * equivalent; every other raw material must omit them.
 */

export interface PurchaseItemInput {
  rawMaterialId: string;
  /** Required for every raw material except Pumice. Decimal string. */
  quantity?: string | undefined;
  /** Required for every raw material except Pumice. Decimal string. */
  unitCost?: string | undefined;
  /** Pumice only. Decimal string, metres. */
  lengthMetres?: string | undefined;
  /** Pumice only. Decimal string, metres. */
  widthMetres?: string | undefined;
  /** Pumice only. Decimal string, metres. */
  heightMetres?: string | undefined;
  /** Pumice only. */
  numberOfLoads?: number | undefined;
  /** Pumice only. Decimal string — reference KES 1,100/m³, never hard-coded. */
  ratePerCubicMetre?: string | undefined;
}

export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: Date;
  /** Free text — e.g. a supplier delivery-note or invoice number. */
  reference?: string | undefined;
  items: PurchaseItemInput[];
}

export interface PurchaseItemSummary {
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
  /** Pumice only. Decimal string, or null for every other raw material. */
  lengthMetres: string | null;
  widthMetres: string | null;
  heightMetres: string | null;
  numberOfLoads: number | null;
}

export interface PurchaseSummary {
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

export interface PurchaseDetail extends Omit<PurchaseSummary, 'itemCount'> {
  items: PurchaseItemSummary[];
}

export type PurchaseSortField = 'purchaseNumber' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListPurchasesFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  supplierId?: string | undefined;
  rawMaterialId?: string | undefined;
  sortBy: PurchaseSortField;
  sortDirection: SortDirection;
}

export interface ListPurchasesResult {
  purchases: PurchaseSummary[];
  totalRecords: number;
}
