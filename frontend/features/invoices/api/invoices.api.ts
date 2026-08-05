import { API_BASE_URL } from '@/lib/config';
import { api, type PaginationMeta } from '@/lib/api-client';
import type { Invoice, InvoiceDetail } from '../types/invoice.types';

export function invoicePdfUrl(id: string): string { return `${API_BASE_URL}/invoices/${id}/pdf`; }

export async function fetchInvoices(filters: { page: number; pageSize: number; search?: string; status?: string; customerId?: string; orderId?: string; paymentStatus?: string }) {
  const { data, meta } = await api.get<Invoice[]>('/invoices', { query: filters });
  return { invoices: data, meta: meta as unknown as PaginationMeta };
}
export async function fetchInvoice(id: string) { const { data } = await api.get<InvoiceDetail>(`/invoices/${id}`); return data; }
export async function createInvoice(input: { orderId: string; dueDate: Date }) { const { data } = await api.post<InvoiceDetail>('/invoices', input); return data; }
export async function voidInvoice(id: string, reason: string) { const { data } = await api.post<InvoiceDetail>(`/invoices/${id}/void`, { reason }); return data; }
