'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as quotationsApi from '../api/quotations.api';
import type { QuotationFilters } from '../types/quotation.types';
import type { QuotationFormValues, QuotationStatusChangeValues } from '../schemas/quotation.schema';

export const quotationKeys = {
  all: ['quotations'] as const,
  lists: () => [...quotationKeys.all, 'list'] as const,
  list: (filters: QuotationFilters) => [...quotationKeys.lists(), filters] as const,
  detail: (id: string) => [...quotationKeys.all, 'detail', id] as const,
};

export function useQuotations(filters: QuotationFilters) {
  return useQuery({
    queryKey: quotationKeys.list(filters),
    queryFn: () => quotationsApi.fetchQuotations(filters),
  });
}

export function useQuotation(id: string | undefined) {
  return useQuery({
    queryKey: quotationKeys.detail(id ?? ''),
    queryFn: () => quotationsApi.fetchQuotation(id as string),
    enabled: Boolean(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: QuotationFormValues) => quotationsApi.createQuotation(values),
    onSuccess: async (quotation) => {
      await queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      toast.success(`${quotation.quotationNumber} saved as a draft.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The quotation could not be saved.'));
    },
  });
}

export function useUpdateQuotation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: QuotationFormValues) => quotationsApi.updateQuotation(id, values),
    onSuccess: async (quotation) => {
      await queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      toast.success(`${quotation.quotationNumber} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The changes could not be saved.'));
    },
  });
}

export function useAcceptQuotation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => quotationsApi.acceptQuotation(id),
    onSuccess: async (quotation) => {
      await queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      toast.success(`${quotation.quotationNumber} accepted.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The quotation could not be accepted.'));
    },
  });
}

export function useRejectQuotation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: QuotationStatusChangeValues) => quotationsApi.rejectQuotation(id, values),
    onSuccess: async (quotation) => {
      await queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      toast.success(`${quotation.quotationNumber} rejected.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The quotation could not be rejected.'));
    },
  });
}

export function useCancelQuotation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: QuotationStatusChangeValues) => quotationsApi.cancelQuotation(id, values),
    onSuccess: async (quotation) => {
      await queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      toast.success(`${quotation.quotationNumber} cancelled.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The quotation could not be cancelled.'));
    },
  });
}

/** Counts for the summary cards above the quotation list. */
export function useQuotationSummary() {
  const [all, draft, accepted] = useQueries({
    queries: [
      {
        queryKey: quotationKeys.list({ page: 1, pageSize: 1 }),
        queryFn: () => quotationsApi.fetchQuotations({ page: 1, pageSize: 1 }),
      },
      {
        queryKey: quotationKeys.list({ page: 1, pageSize: 1, status: 'DRAFT' }),
        queryFn: () => quotationsApi.fetchQuotations({ page: 1, pageSize: 1, status: 'DRAFT' }),
      },
      {
        queryKey: quotationKeys.list({ page: 1, pageSize: 1, status: 'ACCEPTED' }),
        queryFn: () => quotationsApi.fetchQuotations({ page: 1, pageSize: 1, status: 'ACCEPTED' }),
      },
    ],
  });

  return {
    total: all.data?.meta.totalRecords,
    draft: draft.data?.meta.totalRecords,
    accepted: accepted.data?.meta.totalRecords,
    isLoading: all.isPending || draft.isPending || accepted.isPending,
  };
}
