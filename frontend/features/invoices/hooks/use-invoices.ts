'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as api from '../api/invoices.api';

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (f: Record<string, unknown>) => [...invoiceKeys.lists(), f] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
};

function em(e: unknown, fb: string): string { return e instanceof ApiError ? e.message : fb; }

export function useInvoices(f: { page: number; pageSize: number; search?: string; orderId?: string }) {
  return useQuery({ queryKey: invoiceKeys.list(f), queryFn: () => api.fetchInvoices(f) });
}

export function useInvoice(id: string) {
  return useQuery({ queryKey: invoiceKeys.detail(id), queryFn: () => api.fetchInvoice(id), enabled: !!id });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { orderId: string; dueDate: Date }) => api.createInvoice(v),
    onSuccess: async (inv) => {
      await qc.invalidateQueries({ queryKey: invoiceKeys.all });
      toast.success(`${inv.invoiceNumber} created.`);
    },
    onError: (e) => toast.error(em(e, 'Could not create invoice.')),
  });
}

export function useVoidInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => api.voidInvoice(id, reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: invoiceKeys.all });
      toast.success('Invoice voided.');
    },
    onError: (e) => toast.error(em(e, 'Could not void invoice.')),
  });
}
