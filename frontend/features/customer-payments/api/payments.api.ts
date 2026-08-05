import { api, type PaginationMeta } from '@/lib/api-client';
import type { Payment, PaymentDetail } from '../types/payment.types';

export async function fetchPayments(f: { page: number; pageSize: number; search?: string; customerId?: string; status?: string; paymentMethod?: string }) {
  const { data, meta } = await api.get<Payment[]>('/customer-payments', { query: f });
  return { payments: data, meta: meta as unknown as PaginationMeta };
}
export async function fetchPayment(id: string) { const { data } = await api.get<PaymentDetail>(`/customer-payments/${id}`); return data; }
export async function createPayment(v: { customerId: string; amount: string; paymentMethod: string; paymentReference?: string; paymentDate: Date; allocations: { invoiceId: string; amount: string }[] }) { const { data } = await api.post<PaymentDetail>('/customer-payments', v); return data; }
export async function approvePayment(id: string) { const { data } = await api.post<{ status: string; receiptNumber: string }>(`/customer-payments/${id}/approve`, {}); return data; }
export async function reversePayment(id: string, reason: string) { const { data } = await api.post<{ status: string }>(`/customer-payments/${id}/reverse`, { reason }); return data; }
