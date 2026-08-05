'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as api from '../api/payments.api';

export const paymentKeys = {
  all: ['customer-payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (f: Record<string, unknown>) => [...paymentKeys.lists(), f] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
};

function em(e: unknown, fb: string): string { return e instanceof ApiError ? e.message : fb; }

export function usePayments(f: { page: number; pageSize: number; search?: string }) {
  return useQuery({ queryKey: paymentKeys.list(f), queryFn: () => api.fetchPayments(f) });
}

export function usePayment(id: string) {
  return useQuery({ queryKey: paymentKeys.detail(id), queryFn: () => api.fetchPayment(id), enabled: !!id });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { customerId: string; amount: string; paymentMethod: string; paymentReference?: string; paymentDate: Date }) => api.createPayment(v),
    onSuccess: async (p) => { await qc.invalidateQueries({ queryKey: paymentKeys.all }); toast.success(`${p.paymentNumber} saved.`); },
    onError: (e) => toast.error(em(e, 'Could not create payment.')),
  });
}

export function useApprovePayment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { invoiceId: string; amount: string }[]) => api.approvePayment(id, a),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: paymentKeys.all });
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      await qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Approved. Receipt ${r.receiptNumber} issued.`);
    },
    onError: (e) => toast.error(em(e, 'Could not approve.')),
  });
}

export function useReversePayment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => api.reversePayment(id, reason),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: paymentKeys.all }); toast.success('Payment reversed.'); },
    onError: (e) => toast.error(em(e, 'Could not reverse.')),
  });
}
