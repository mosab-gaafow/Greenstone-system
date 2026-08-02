import { api } from '@/lib/api-client';
import type { CreditStatusResult, OpeningBalanceDetail } from '../types/customer-credit.types';
import type { OpeningBalanceFormValues } from '../schemas/customer-credit.schema';

export async function fetchCreditStatus(customerId: string): Promise<CreditStatusResult> {
  const { data } = await api.get<CreditStatusResult>(`/customers/${customerId}/credit-status`);
  return data;
}

export async function setOpeningBalance(
  customerId: string,
  values: OpeningBalanceFormValues,
): Promise<OpeningBalanceDetail> {
  const { data } = await api.patch<OpeningBalanceDetail>(
    `/customers/${customerId}/opening-balance`,
    values,
  );
  return data;
}
