import { api } from '@/lib/api-client';

export interface ReportSummary {
  periodLabel: string;
}

export interface OrdersReportRow {
  orderId: string; orderNumber: string; date: string;
  customerId: string; customerName: string;
  itemCount: number; total: string; amountPaid: string;
  outstanding: string; paymentStatus: string; fulfillmentStatus: string;
}
export interface OrdersReportResult extends ReportSummary {
  rows: OrdersReportRow[];
  summary: { orderCount: number; totalValue: string; totalPaid: string; totalOutstanding: string };
}

export interface TopOrdersRow {
  rank: number; orderId: string; orderNumber: string; date: string;
  customerId: string; customerName: string;
  total: string; amountPaid: string; outstanding: string;
  paymentStatus: string; fulfillmentStatus: string;
}
export interface TopOrdersResult extends ReportSummary { rows: TopOrdersRow[] }

export interface TopCustomersRow {
  rank: number; customerId: string; customerName: string;
  orderCount: number; paymentCount: number;
  totalInvoiced: string; paymentsReceived: string; outstanding: string;
}
export interface TopCustomersResult extends ReportSummary { rows: TopCustomersRow[] }

export interface CustomerBalanceRow {
  customerId: string; customerName: string; phone: string | null;
  openingBalance: string; totalInvoiced: string;
  approvedPayments: string; outstanding: string; creditStatus: string;
}
export interface CustomerBalancesResult {
  rows: CustomerBalanceRow[];
  summary: { totalOutstanding: string; customerCount: number };
}

export interface InvoicesReportRow {
  invoiceId: string; invoiceNumber: string; date: string;
  customerId: string; customerName: string;
  orderId: string; orderNumber: string;
  total: string; amountPaid: string; outstanding: string;
  invoiceStatus: string; paymentStatus: string;
}
export interface InvoicesReportResult extends ReportSummary {
  rows: InvoicesReportRow[];
  summary: { invoiceCount: number; issuedValue: string; amountPaid: string; validOutstanding: string; voidedValue: string; voidedCount: number };
}

export interface PaymentsReportRow {
  paymentId: string; paymentNumber: string; date: string;
  customerId: string; customerName: string;
  amount: string; method: string; reference: string | null;
  status: string; invoiceNumbers: string[];
  receiptNumber: string | null; hasEvidence: boolean;
}
export interface PaymentsReportResult extends ReportSummary {
  rows: PaymentsReportRow[];
  summary: { paymentCount: number; recordedAmount: string; approvedAmount: string; pendingAmount: string; reversedAmount: string };
}

export interface ReceiptsReportRow {
  receiptId: string; receiptNumber: string; date: string;
  customerId: string; customerName: string;
  paymentNumber: string; invoiceNumber: string | null;
  amount: string; paymentMethod: string; status: string;
}
export interface ReceiptsReportResult extends ReportSummary {
  rows: ReceiptsReportRow[];
  summary: { receiptCount: number; activeAmount: string; activeCount: number; voidedAmount: string; voidedCount: number };
}

export interface ReportQueryParams {
  from: string;
  to: string;
  search?: string;
  customerId?: string;
  orderStatus?: string;
  invoiceStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  receiptStatus?: string;
  balanceFilter?: string;
  limit?: number;
}

function toParams(p: ReportQueryParams): Record<string, string | number> {
  const params: Record<string, string | number> = { from: p.from, to: p.to };
  if (p.search) params.search = p.search;
  if (p.customerId) params.customerId = p.customerId;
  if (p.orderStatus) params.orderStatus = p.orderStatus;
  if (p.invoiceStatus) params.invoiceStatus = p.invoiceStatus;
  if (p.paymentStatus) params.paymentStatus = p.paymentStatus;
  if (p.paymentMethod) params.paymentMethod = p.paymentMethod;
  if (p.receiptStatus) params.receiptStatus = p.receiptStatus;
  if (p.balanceFilter && p.balanceFilter !== 'all') params.balanceFilter = p.balanceFilter;
  if (p.limit) params.limit = p.limit;
  return params;
}

export async function fetchOrdersReport(params: ReportQueryParams) {
  const { data } = await api.get<OrdersReportResult>('/reports/orders', { query: toParams(params) });
  return data;
}
export async function fetchTopOrders(params: ReportQueryParams) {
  const { data } = await api.get<TopOrdersResult>('/reports/top-orders', { query: toParams(params) });
  return data;
}
export async function fetchTopCustomers(params: ReportQueryParams) {
  const { data } = await api.get<TopCustomersResult>('/reports/top-customers', { query: toParams(params) });
  return data;
}
export async function fetchCustomerBalances(params: { search?: string; balanceFilter?: string } = {}) {
  const query: Record<string, string> = {};
  if (params.search) query.search = params.search;
  if (params.balanceFilter && params.balanceFilter !== 'all') query.balanceFilter = params.balanceFilter;
  const { data } = await api.get<CustomerBalancesResult>('/reports/customer-balances', { query });
  return data;
}
export async function fetchInvoicesReport(params: ReportQueryParams) {
  const { data } = await api.get<InvoicesReportResult>('/reports/invoices', { query: toParams(params) });
  return data;
}
export async function fetchPaymentsReport(params: ReportQueryParams) {
  const { data } = await api.get<PaymentsReportResult>('/reports/payments', { query: toParams(params) });
  return data;
}
export async function fetchReceiptsReport(params: ReportQueryParams) {
  const { data } = await api.get<ReceiptsReportResult>('/reports/receipts', { query: toParams(params) });
  return data;
}
