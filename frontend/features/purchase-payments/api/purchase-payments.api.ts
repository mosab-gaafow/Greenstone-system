import { api, type PaginationMeta } from '@/lib/api-client';
import { API_BASE_URL } from '@/lib/config';
import type {
  PurchasePayment,
  PurchasePaymentDetail,
  PurchasePaymentFilters,
} from '../types/purchase-payment.types';
import type { PurchasePaymentFormValues } from '../schemas/purchase-payment.schema';

export interface PurchasePaymentListResult {
  payments: PurchasePayment[];
  meta: PaginationMeta;
}

export async function fetchPurchasePayments(
  filters: PurchasePaymentFilters,
): Promise<PurchasePaymentListResult> {
  const { data, meta } = await api.get<PurchasePayment[]>('/purchase-payments', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      supplierId: filters.supplierId,
      purchaseId: filters.purchaseId,
      status: filters.status,
    },
  });

  return { payments: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchPurchasePayment(id: string): Promise<PurchasePaymentDetail> {
  const { data } = await api.get<PurchasePaymentDetail>(`/purchase-payments/${id}`);
  return data;
}

/** Always sent as `multipart/form-data`, whether or not a file is attached. */
export async function createPurchasePayment(
  values: PurchasePaymentFormValues,
  evidenceFile: File | null,
): Promise<PurchasePaymentDetail> {
  const formData = new FormData();
  formData.set('supplierId', values.supplierId);
  formData.set('amount', values.amount);
  formData.set('paymentMethod', values.paymentMethod);
  formData.set('paymentReference', values.paymentReference);
  formData.set('paymentDate', values.paymentDate);
  formData.set('allocations', JSON.stringify(values.allocations));

  if (evidenceFile) {
    formData.set('evidenceFile', evidenceFile);
  }

  const { data } = await api.post<PurchasePaymentDetail>('/purchase-payments', formData);
  return data;
}

export async function approvePurchasePayment(id: string): Promise<PurchasePaymentDetail> {
  const { data } = await api.post<PurchasePaymentDetail>(`/purchase-payments/${id}/approve`, {});
  return data;
}

export async function reversePurchasePayment(
  id: string,
  reason: string,
): Promise<PurchasePaymentDetail> {
  const { data } = await api.post<PurchasePaymentDetail>(`/purchase-payments/${id}/reverse`, {
    reason,
  });
  return data;
}

/** Authenticated download — the browser sends the session cookie on this direct navigation. */
export function evidenceDownloadUrl(id: string): string {
  return `${API_BASE_URL}/purchase-payments/${id}/evidence`;
}
