'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as customerCreditApi from '../api/customer-credit.api';
import type { OpeningBalanceFormValues } from '../schemas/customer-credit.schema';

export const customerCreditKeys = {
  status: (customerId: string) => ['customers', customerId, 'credit-status'] as const,
};

export function useCreditStatus(customerId: string | undefined) {
  return useQuery({
    queryKey: customerCreditKeys.status(customerId ?? ''),
    queryFn: () => customerCreditApi.fetchCreditStatus(customerId as string),
    enabled: Boolean(customerId),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useSetOpeningBalance(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: OpeningBalanceFormValues) =>
      customerCreditApi.setOpeningBalance(customerId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerCreditKeys.status(customerId) });
      toast.success('Opening balance saved.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The opening balance could not be saved.'));
    },
  });
}
