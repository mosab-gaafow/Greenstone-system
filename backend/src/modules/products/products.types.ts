import type { ProductCategory } from '../../generated/prisma/client.js';

/**
 * Product module types.
 *
 * There is deliberately no price anywhere in this module. Greenstone agrees a
 * price per customer per transaction, and order and invoice items each store
 * their own snapshot. See business-blueprint section 2.4.
 */

export interface ProductSummary {
  id: string;
  name: string;
  category: ProductCategory;
  size: string;
  description: string | null;
  /** Short day-to-day name (e.g. "4-inch"). Null until confirmed. */
  operationalName: string | null;
  /** Confirmed pieces one pallet holds. Null until confirmed — Production
   *  refuses to run for a product with no value here. */
  piecesPerPallet: number | null;
  /** Confirmed max pieces of this single product one truck can carry. Null
   *  until confirmed. Single-product only. */
  maxPiecesPerTruck: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  category: ProductCategory;
  size: string;
  description?: string | null | undefined;
  operationalName?: string | null | undefined;
  piecesPerPallet?: number | null | undefined;
  maxPiecesPerTruck?: number | null | undefined;
}

export interface UpdateProductInput {
  name?: string | undefined;
  category?: ProductCategory | undefined;
  size?: string | undefined;
  description?: string | null | undefined;
  operationalName?: string | null | undefined;
  piecesPerPallet?: number | null | undefined;
  maxPiecesPerTruck?: number | null | undefined;
}

export type ProductSortField = 'name' | 'category' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListProductsFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  category?: ProductCategory | undefined;
  /** Undefined means both active and inactive. */
  isActive?: boolean | undefined;
  sortBy: ProductSortField;
  sortDirection: SortDirection;
}

export interface ListProductsResult {
  products: ProductSummary[];
  totalRecords: number;
}
