import { useQuery } from '@tanstack/react-query';
import { fetchReceipt, fetchReceipts } from '../api/receipts.api';

export const receiptKeys = {
  all: ['receipts'] as const,
  lists: () => [...receiptKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...receiptKeys.lists(), filters] as const,
  details: () => [...receiptKeys.all, 'detail'] as const,
  detail: (id: string) => [...receiptKeys.details(), id] as const,
};

export function useReceipts(filters: { page: number; pageSize: number; search?: string; status?: string; paymentMethod?: string }) {
  return useQuery({
    queryKey: receiptKeys.list(filters),
    queryFn: () => fetchReceipts(filters),
    placeholderData: (prev) => prev,
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: receiptKeys.detail(id),
    queryFn: () => fetchReceipt(id),
    placeholderData: (prev) => prev,
  });
}
