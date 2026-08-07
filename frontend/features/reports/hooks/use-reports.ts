'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '../api/reports.api';
import type { ReportQueryParams } from '../api/reports.api';

function qk(base: string, params: ReportQueryParams) {
  return [base, JSON.stringify(params)] as const;
}

export function useOrdersReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:orders', params), queryFn: () => api.fetchOrdersReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useTopOrders(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:top-orders', params), queryFn: () => api.fetchTopOrders(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useTopCustomers(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:top-customers', params), queryFn: () => api.fetchTopCustomers(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useCustomerBalances(params: { search?: string; balanceFilter?: string } = {}) {
  return useQuery({ queryKey: ['reports:customer-balances', params] as const, queryFn: () => api.fetchCustomerBalances(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useInvoicesReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:invoices', params), queryFn: () => api.fetchInvoicesReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function usePaymentsReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:payments', params), queryFn: () => api.fetchPaymentsReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useReceiptsReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:receipts', params), queryFn: () => api.fetchReceiptsReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
