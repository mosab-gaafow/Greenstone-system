/**
 * Product types.
 *
 * Mirrors the backend contract. Note there is no price — Greenstone agrees a
 * price per customer per transaction, and quotation, order and invoice items
 * each hold their own snapshot.
 */

export const PRODUCT_CATEGORIES = ['HOLLOW_BLOCK', 'HOLLOW_POT'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  size: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  page: number;
  pageSize: number;
  search?: string;
  category?: ProductCategory;
  isActive?: boolean;
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  HOLLOW_BLOCK: 'Hollow block',
  HOLLOW_POT: 'Hollow pot',
};

export function categoryLabel(category: ProductCategory): string {
  return CATEGORY_LABELS[category];
}

export const CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));
