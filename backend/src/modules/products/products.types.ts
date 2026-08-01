import type { ProductCategory } from '../../generated/prisma/client.js';

/**
 * Product module types.
 *
 * There is deliberately no price anywhere in this module. Greenstone agrees a
 * price per customer per transaction, and quotation, order and invoice items
 * each store their own snapshot. See business-blueprint section 2.4.
 */

export interface ProductSummary {
  id: string;
  name: string;
  category: ProductCategory;
  size: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  category: ProductCategory;
  size: string;
  description?: string | null | undefined;
}

export interface UpdateProductInput {
  name?: string | undefined;
  category?: ProductCategory | undefined;
  size?: string | undefined;
  description?: string | null | undefined;
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
