'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as supplierBalanceApi from '../api/supplier-balance.api';
import type { SupplierOpeningBalanceFormValues } from '../schemas/supplier-balance.schema';

export const supplierBalanceKeys = {
  balance: (supplierId: string) => ['suppliers', supplierId, 'balance'] as const,
};

export function useSupplierBalance(supplierId: string | undefined) {
  return useQuery({
    queryKey: supplierBalanceKeys.balance(supplierId ?? ''),
    queryFn: () => supplierBalanceApi.fetchSupplierBalance(supplierId as string),
    enabled: Boolean(supplierId),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useSetSupplierOpeningBalance(supplierId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: SupplierOpeningBalanceFormValues) =>
      supplierBalanceApi.setSupplierOpeningBalance(supplierId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: supplierBalanceKeys.balance(supplierId) });
      toast.success('Opening balance saved.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The opening balance could not be saved.'));
    },
  });
}
