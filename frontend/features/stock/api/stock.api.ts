import { api, type PaginationMeta } from '@/lib/api-client';
import type { StockRow } from '../stock.types';
import type { FinishedStockBalance, FinishedStockMovement } from '@/features/products/types/finished-stock.types';

export async function fetchAllStock(): Promise<StockRow[]> {
  const { data } = await api.get<StockRow[]>('/products/finished-stock');
  return data;
}

export async function fetchProductStock(productId: string): Promise<FinishedStockBalance> {
  const { data } = await api.get<FinishedStockBalance>(`/products/${productId}/finished-stock`);
  return data;
}

export interface MovementListResult {
  movements: FinishedStockMovement[];
  meta: PaginationMeta;
}

export async function fetchStockMovements(
  productId: string,
  page: number,
): Promise<MovementListResult> {
  const { data, meta } = await api.get<FinishedStockMovement[]>(
    `/products/${productId}/finished-stock/movements`,
    { query: { page, pageSize: 10 } },
  );
  return { movements: data, meta: meta as unknown as PaginationMeta };
}
