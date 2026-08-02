import { api, type PaginationMeta } from '@/lib/api-client';
import type { FinishedStockBalance, FinishedStockMovement } from '../types/finished-stock.types';
import type {
  AdjustFinishedStockFormValues,
  OpeningFinishedStockFormValues,
  RecordBrokenStockFormValues,
} from '../schemas/finished-stock.schema';

export async function fetchFinishedStock(productId: string): Promise<FinishedStockBalance> {
  const { data } = await api.get<FinishedStockBalance>(`/products/${productId}/finished-stock`);
  return data;
}

export interface FinishedStockMovementListResult {
  movements: FinishedStockMovement[];
  meta: PaginationMeta;
}

export async function fetchFinishedStockMovements(
  productId: string,
  page: number,
  pageSize: number,
): Promise<FinishedStockMovementListResult> {
  const { data, meta } = await api.get<FinishedStockMovement[]>(
    `/products/${productId}/finished-stock/movements`,
    { query: { page, pageSize } },
  );

  return { movements: data, meta: meta as unknown as PaginationMeta };
}

export async function setOpeningFinishedStock(
  productId: string,
  values: OpeningFinishedStockFormValues,
): Promise<FinishedStockBalance> {
  const { data } = await api.post<FinishedStockBalance>(
    `/products/${productId}/finished-stock/opening`,
    {
      quantity: values.quantity,
      reason: values.reason?.trim() ? values.reason.trim() : undefined,
    },
  );
  return data;
}

export async function adjustFinishedStock(
  productId: string,
  values: AdjustFinishedStockFormValues,
): Promise<FinishedStockBalance> {
  const { data } = await api.post<FinishedStockBalance>(
    `/products/${productId}/finished-stock/adjust`,
    values,
  );
  return data;
}

export async function recordBrokenFinishedStock(
  productId: string,
  values: RecordBrokenStockFormValues,
): Promise<void> {
  await api.post('/broken-products', {
    productId,
    quantity: values.quantity,
    stage: 'FINISHED_STOCK',
    reason: values.reason?.trim() ? values.reason.trim() : undefined,
  });
}
