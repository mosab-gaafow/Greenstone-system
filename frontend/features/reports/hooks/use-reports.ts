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

// ── Phase 11C2: Operations ───────────────────────────────────────

export function useProductionReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:production', params), queryFn: () => api.fetchProductionReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useCuringReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:curing', params), queryFn: () => api.fetchCuringReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useDeliveriesReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:deliveries', params), queryFn: () => api.fetchDeliveriesReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}

// ── Phase 11C2: Stock ─────────────────────────────────────────────

export function useFinishedStockReport(params: { search?: string } = {}) {
  return useQuery({ queryKey: ['reports:finished-stock', params] as const, queryFn: () => api.fetchFinishedStockReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useReservedStockReport(params: { search?: string } = {}) {
  return useQuery({ queryKey: ['reports:reserved-stock', params] as const, queryFn: () => api.fetchReservedStockReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useAvailableStockReport(params: { search?: string } = {}) {
  return useQuery({ queryKey: ['reports:available-stock', params] as const, queryFn: () => api.fetchAvailableStockReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useLowStockReport(params: { search?: string } = {}) {
  return useQuery({ queryKey: ['reports:low-stock', params] as const, queryFn: () => api.fetchLowStockReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useStockMovementReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:stock-movement', params), queryFn: () => api.fetchStockMovementReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}

// ── Phase 11C3: Purchasing ───────────────────────────────────────

export function usePurchasesReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:purchases', params), queryFn: () => api.fetchPurchasesReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function usePurchasePaymentsReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:purchase-payments', params), queryFn: () => api.fetchPurchasePaymentsReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useSuppliersReport(params: { search?: string; balanceFilter?: string } = {}) {
  return useQuery({ queryKey: ['reports:suppliers', params] as const, queryFn: () => api.fetchSuppliersReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}

// ── Phase 11C4: Finance ───────────────────────────────────────────

export function useExpensesReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:expenses', params), queryFn: () => api.fetchExpensesReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useSalariesReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:salaries', params), queryFn: () => api.fetchSalariesReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useOutstandingInvoicesReport(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:outstanding-invoices', params), queryFn: () => api.fetchOutstandingInvoicesReport(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
export function useBillingSummary(params: ReportQueryParams) {
  return useQuery({ queryKey: qk('reports:billing-summary', params), queryFn: () => api.fetchBillingSummary(params), placeholderData: (prev) => prev, staleTime: 30_000 });
}
