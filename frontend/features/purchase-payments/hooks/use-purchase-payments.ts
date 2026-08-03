'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as purchasePaymentsApi from '../api/purchase-payments.api';
import type { PurchasePaymentFilters } from '../types/purchase-payment.types';
import type { PurchasePaymentFormValues } from '../schemas/purchase-payment.schema';

export const purchasePaymentKeys = {
  all: ['purchase-payments'] as const,
  lists: () => [...purchasePaymentKeys.all, 'list'] as const,
  list: (filters: PurchasePaymentFilters) => [...purchasePaymentKeys.lists(), filters] as const,
  detail: (id: string) => [...purchasePaymentKeys.all, 'detail', id] as const,
};

export function usePurchasePayments(filters: PurchasePaymentFilters) {
  return useQuery({
    queryKey: purchasePaymentKeys.list(filters),
    queryFn: () => purchasePaymentsApi.fetchPurchasePayments(filters),
  });
}

export function usePurchasePayment(id: string) {
  return useQuery({
    queryKey: purchasePaymentKeys.detail(id),
    queryFn: () => purchasePaymentsApi.fetchPurchasePayment(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreatePurchasePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      values,
      evidenceFile,
    }: {
      values: PurchasePaymentFormValues;
      evidenceFile: File | null;
    }) => purchasePaymentsApi.createPurchasePayment(values, evidenceFile),
    onSuccess: async (payment) => {
      await queryClient.invalidateQueries({ queryKey: purchasePaymentKeys.all });
      // A payment affects the supplier's balance, and once approved, each
      // allocated purchase's own payment history.
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      await queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success(`${payment.paymentNumber} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The purchase payment could not be saved.'));
    },
  });
}

export function useApprovePurchasePayment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => purchasePaymentsApi.approvePurchasePayment(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: purchasePaymentKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Payment approved.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The payment could not be approved.'));
    },
  });
}

export function useReversePurchasePayment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => purchasePaymentsApi.reversePurchasePayment(id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: purchasePaymentKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Payment reversed.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The payment could not be reversed.'));
    },
  });
}
