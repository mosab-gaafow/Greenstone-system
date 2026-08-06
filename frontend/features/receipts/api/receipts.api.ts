import { API_BASE_URL } from '@/lib/config';
import { api, type PaginationMeta } from '@/lib/api-client';
import type { Receipt, ReceiptDetail } from '../types/receipt.types';

export function receiptPdfUrl(id: string): string { return `${API_BASE_URL}/receipts/${id}/pdf?t=${Date.now()}`; }

export async function fetchReceipts(filters: { page: number; pageSize: number; search?: string; status?: string; paymentMethod?: string }) {
  const { data, meta } = await api.get<Receipt[]>('/receipts', { query: filters });
  return { receipts: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchReceipt(id: string) {
  const { data } = await api.get<ReceiptDetail>(`/receipts/${id}`);
  return data;
}
