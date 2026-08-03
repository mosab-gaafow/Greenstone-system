import { api, type PaginationMeta } from '@/lib/api-client';
import type { Purchase, PurchaseDetail, PurchaseFilters } from '../types/purchase.types';
import type { PurchaseFormValues } from '../schemas/purchase.schema';

export interface PurchaseListResult {
  purchases: Purchase[];
  meta: PaginationMeta;
}

export async function fetchPurchases(filters: PurchaseFilters): Promise<PurchaseListResult> {
  const { data, meta } = await api.get<Purchase[]>('/purchases', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      supplierId: filters.supplierId,
      rawMaterialId: filters.rawMaterialId,
    },
  });

  return { purchases: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchPurchase(id: string): Promise<PurchaseDetail> {
  const { data } = await api.get<PurchaseDetail>(`/purchases/${id}`);
  return data;
}

export async function createPurchase(values: PurchaseFormValues): Promise<PurchaseDetail> {
  const { data } = await api.post<PurchaseDetail>('/purchases', {
    supplierId: values.supplierId,
    purchaseDate: values.purchaseDate,
    reference: values.reference?.trim() ? values.reference.trim() : undefined,
    items: values.items.map((item) => ({
      rawMaterialId: item.rawMaterialId,
      quantity: item.quantity?.trim() || undefined,
      unitCost: item.unitCost?.trim() || undefined,
      lengthMetres: item.lengthMetres?.trim() || undefined,
      widthMetres: item.widthMetres?.trim() || undefined,
      heightMetres: item.heightMetres?.trim() || undefined,
      numberOfLoads: item.numberOfLoads?.trim() ? Number(item.numberOfLoads) : undefined,
      ratePerCubicMetre: item.ratePerCubicMetre?.trim() || undefined,
    })),
  });
  return data;
}
