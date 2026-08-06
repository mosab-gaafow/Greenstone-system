import { API_BASE_URL } from '@/lib/config';
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

export function evidenceDownloadUrl(id: string): string { return `${API_BASE_URL}/customer-payments/${id}/evidence`; }
export function evidencePreviewUrl(id: string): string { return `${API_BASE_URL}/customer-payments/${id}/evidence?disposition=inline`; }

export async function uploadEvidence(id: string, file: File) {
  // Fetch a fresh CSRF token from the server (same pattern as the API client).
  // The double-submit CSRF pattern requires a token that the server just issued,
  // stored in the greenstone.csrf cookie, echoed back in the x-csrf-token header.
  const tokenRes = await fetch(`${API_BASE_URL}/csrf-token`, { credentials: 'include' });
  if (!tokenRes.ok) throw new Error('Could not obtain a CSRF token.');
  const tokenBody = await tokenRes.json() as { data: { csrfToken: string } };
  const csrfToken = tokenBody.data.csrfToken;

  const formData = new FormData();
  formData.append('evidenceFile', file);

  const res = await fetch(`${API_BASE_URL}/customer-payments/${id}/evidence`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: { 'x-csrf-token': csrfToken },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as Record<string, unknown>));
    const err = (body as Record<string, unknown>).error as Record<string, unknown> | undefined;
    throw new Error((err?.message as string) ?? 'Upload failed.');
  }
  return res.json();
}
