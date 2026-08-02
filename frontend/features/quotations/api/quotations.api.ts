import { api, type PaginationMeta } from '@/lib/api-client';
import { absoluteUrl, API_BASE_URL } from '@/lib/config';
import type { Quotation, QuotationDetail, QuotationFilters } from '../types/quotation.types';
import type { QuotationFormValues, QuotationStatusChangeValues } from '../schemas/quotation.schema';

export interface QuotationListResult {
  quotations: Quotation[];
  meta: PaginationMeta;
}

export async function fetchQuotations(filters: QuotationFilters): Promise<QuotationListResult> {
  const { data, meta } = await api.get<Quotation[]>('/quotations', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      status: filters.status,
      customerId: filters.customerId,
    },
  });

  return { quotations: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchQuotation(id: string): Promise<QuotationDetail> {
  const { data } = await api.get<QuotationDetail>(`/quotations/${id}`);
  return data;
}

export async function createQuotation(values: QuotationFormValues): Promise<QuotationDetail> {
  const { data } = await api.post<QuotationDetail>('/quotations', values);
  return data;
}

export async function updateQuotation(
  id: string,
  values: QuotationFormValues,
): Promise<QuotationDetail> {
  const { data } = await api.patch<QuotationDetail>(`/quotations/${id}`, values);
  return data;
}

export async function acceptQuotation(id: string): Promise<QuotationDetail> {
  const { data } = await api.post<QuotationDetail>(`/quotations/${id}/accept`, {});
  return data;
}

export async function rejectQuotation(
  id: string,
  values: QuotationStatusChangeValues,
): Promise<QuotationDetail> {
  const { data } = await api.post<QuotationDetail>(`/quotations/${id}/reject`, values);
  return data;
}

export async function cancelQuotation(
  id: string,
  values: QuotationStatusChangeValues,
): Promise<QuotationDetail> {
  const { data } = await api.post<QuotationDetail>(`/quotations/${id}/cancel`, values);
  return data;
}

/**
 * The PDF download URL for a quotation.
 *
 * Not fetched as JSON through the central client — the response is a binary
 * file. Opened directly (a real navigation, not `fetch`), so the browser
 * sends the session cookie itself and hands the response to its normal
 * download handling.
 */
export function quotationPdfUrl(id: string): string {
  return absoluteUrl(`${API_BASE_URL}/quotations/${id}/pdf`);
}
