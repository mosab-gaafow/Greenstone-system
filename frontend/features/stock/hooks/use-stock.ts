'use client';

import { useQuery } from '@tanstack/react-query';
import * as stockApi from '../api/stock.api';

export const stockKeys = {
  all: ['stock'] as const,
  list: () => [...stockKeys.all, 'list'] as const,
  detail: (productId: string) => [...stockKeys.all, 'detail', productId] as const,
  movements: (productId: string, page: number) =>
    [...stockKeys.all, 'movements', productId, page] as const,
};

export function useStockList() {
  return useQuery({
    queryKey: stockKeys.list(),
    queryFn: () => stockApi.fetchAllStock(),
  });
}

export function useProductStock(productId: string) {
  return useQuery({
    queryKey: stockKeys.detail(productId),
    queryFn: () => stockApi.fetchProductStock(productId),
    enabled: !!productId,
  });
}

export function useStockMovements(productId: string, page: number) {
  return useQuery({
    queryKey: stockKeys.movements(productId, page),
    queryFn: () => stockApi.fetchStockMovements(productId, page),
    enabled: !!productId,
  });
}
