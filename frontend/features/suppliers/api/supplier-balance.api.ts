import { api } from '@/lib/api-client';
import type { SupplierBalanceResult, SupplierOpeningBalanceDetail } from '../types/supplier-balance.types';
import type { SupplierOpeningBalanceFormValues } from '../schemas/supplier-balance.schema';

export async function fetchSupplierBalance(supplierId: string): Promise<SupplierBalanceResult> {
  const { data } = await api.get<SupplierBalanceResult>(`/suppliers/${supplierId}/balance`);
  return data;
}

export async function setSupplierOpeningBalance(
  supplierId: string,
  values: SupplierOpeningBalanceFormValues,
): Promise<SupplierOpeningBalanceDetail> {
  const { data } = await api.patch<SupplierOpeningBalanceDetail>(
    `/suppliers/${supplierId}/opening-balance`,
    values,
  );
  return data;
}
