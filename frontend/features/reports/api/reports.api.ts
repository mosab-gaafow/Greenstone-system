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
  status?: string;
  movementType?: string;
  category?: string;
  salaryType?: string;
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
  if (p.status) params.status = p.status;
  if (p.movementType) params.movementType = p.movementType;
  if (p.salaryType) params.salaryType = p.salaryType;
  if (p.category) params.category = p.category;
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

// ── Phase 11C2: Operations ───────────────────────────────────────

export interface ProductionReportRow {
  batchId: string; productionNumber: string; date: string;
  purpose: string; orderNumber: string | null; status: string;
  productCount: number; totalProduced: number; totalBroken: number; totalUsable: number;
}
export interface ProductionReportResult extends ReportSummary {
  rows: ProductionReportRow[];
  summary: { batchCount: number; totalProduced: number; totalBroken: number; totalUsable: number };
}

export interface CuringReportRow {
  curingId: string; batchId: string; productionNumber: string; productName: string;
  quantityEntering: number; duration: string; startedAt: string;
  plannedCompletion: string; actualRelease: string | null;
  brokenQuantity: number; releasedQuantity: number | null; isReleased: boolean;
}
export interface CuringReportResult extends ReportSummary {
  rows: CuringReportRow[];
  summary: { recordCount: number; totalEntering: number; totalReleased: number; pendingCount: number; pendingQuantity: number };
}

export interface DeliveriesReportRow {
  deliveryId: string; deliveryNumber: string; date: string;
  orderNumber: string; customerName: string; driverName: string;
  vehicleReg: string; status: string; itemCount: number; totalQuantity: number;
  transportCost: string | null;
}
export interface DeliveriesReportResult extends ReportSummary {
  rows: DeliveriesReportRow[];
  summary: { tripCount: number; plannedCount: number; dispatchedCount: number; deliveredCount: number; plannedQty: number; dispatchedQty: number; deliveredQty: number; actualTransportCost: string; plannedTransportCost: string };
}

export async function fetchProductionReport(params: ReportQueryParams) {
  const { data } = await api.get<ProductionReportResult>('/reports/production', { query: toParams(params) });
  return data;
}
export async function fetchCuringReport(params: ReportQueryParams) {
  const { data } = await api.get<CuringReportResult>('/reports/curing', { query: toParams(params) });
  return data;
}
export async function fetchDeliveriesReport(params: ReportQueryParams) {
  const { data } = await api.get<DeliveriesReportResult>('/reports/deliveries', { query: toParams(params) });
  return data;
}

// ── Phase 11C2: Stock ─────────────────────────────────────────────

export interface FinishedStockRow {
  productId: string; productName: string;
  physicalQuantity: number; reservedQuantity: number; availableQuantity: number;
}
export interface FinishedStockResult {
  rows: FinishedStockRow[];
  summary: { productCount: number; totalPhysical: number; totalReserved: number; totalAvailable: number };
}

export interface LowStockRow extends FinishedStockRow {
  reorderLevel: number;
}
export interface LowStockResult {
  rows: LowStockRow[];
  summary: { productCount: number; totalAvailable: number };
}

export interface StockMovementRow {
  movementId: string; date: string; productName: string;
  movementType: string; quantity: number; quantityIn: number; quantityOut: number;
  balanceAfter: number; reason: string | null;
  referenceLabel: string | null; referenceHref: string | null;
}
export interface StockMovementResult extends ReportSummary {
  rows: StockMovementRow[];
  summary: { movementCount: number; totalIn: number; totalOut: number };
}

export async function fetchFinishedStockReport(params: { search?: string } = {}) {
  const query: Record<string, string> = {};
  if (params.search) query.search = params.search;
  const { data } = await api.get<FinishedStockResult>('/reports/finished-stock', { query });
  return data;
}
export async function fetchReservedStockReport(params: { search?: string } = {}) {
  const query: Record<string, string> = {};
  if (params.search) query.search = params.search;
  const { data } = await api.get<FinishedStockResult>('/reports/reserved-stock', { query });
  return data;
}
export async function fetchAvailableStockReport(params: { search?: string } = {}) {
  const query: Record<string, string> = {};
  if (params.search) query.search = params.search;
  const { data } = await api.get<FinishedStockResult>('/reports/available-stock', { query });
  return data;
}
export async function fetchLowStockReport(params: { search?: string } = {}) {
  const query: Record<string, string> = {};
  if (params.search) query.search = params.search;
  const { data } = await api.get<LowStockResult>('/reports/low-stock', { query });
  return data;
}
export async function fetchStockMovementReport(params: ReportQueryParams) {
  const { data } = await api.get<StockMovementResult>('/reports/stock-movement', { query: toParams(params) });
  return data;
}

// ── Phase 11C3: Purchasing ────────────────────────────────────────

export interface PurchasesReportRow {
  purchaseId: string; purchaseNumber: string; date: string;
  supplierId: string; supplierName: string; reference: string | null;
  itemCount: number; totalCost: string;
}
export interface PurchasesReportResult extends ReportSummary {
  rows: PurchasesReportRow[];
  summary: { purchaseCount: number; totalCost: string };
}

export interface PurchasePaymentsReportRow {
  paymentId: string; paymentNumber: string; date: string;
  supplierId: string; supplierName: string; amount: string;
  method: string; reference: string; status: string;
  purchaseNumbers: string[]; hasEvidence: boolean;
}
export interface PurchasePaymentsReportResult extends ReportSummary {
  rows: PurchasePaymentsReportRow[];
  summary: { paymentCount: number; recordedAmount: string; approvedAmount: string; pendingAmount: string; reversedAmount: string };
}

export interface SuppliersReportRow {
  supplierId: string; supplierName: string; phone: string | null;
  openingBalance: string; totalPurchases: string; approvedPayments: string; outstanding: string;
}
export interface SuppliersReportResult {
  rows: SuppliersReportRow[];
  summary: { supplierCount: number; totalOutstanding: string };
}

export async function fetchPurchasesReport(params: ReportQueryParams) {
  const { data } = await api.get<PurchasesReportResult>('/reports/purchases', { query: toParams(params) });
  return data;
}
export async function fetchPurchasePaymentsReport(params: ReportQueryParams) {
  const { data } = await api.get<PurchasePaymentsReportResult>('/reports/purchase-payments', { query: toParams(params) });
  return data;
}
export async function fetchSuppliersReport(params: { search?: string; balanceFilter?: string } = {}) {
  const query: Record<string, string> = {};
  if (params.search) query.search = params.search;
  if (params.balanceFilter && params.balanceFilter !== 'all') query.balanceFilter = params.balanceFilter;
  const { data } = await api.get<SuppliersReportResult>('/reports/suppliers', { query });
  return data;
}

// ── Phase 11C4: Finance ───────────────────────────────────────────

export interface ExpensesReportRow {
  expenseId: string; expenseNumber: string; date: string;
  category: string; description: string; amount: string;
  paymentMethod: string; paymentReference: string | null; hasEvidence: boolean;
}
export interface ExpensesReportResult extends ReportSummary {
  rows: ExpensesReportRow[];
  summary: { expenseCount: number; totalAmount: string };
}

export interface SalariesReportRow {
  salaryId: string; salaryNumber: string; date: string;
  employeeId: string; employeeName: string; salaryType: string;
  periodStart: string; periodEnd: string; amount: string;
  paymentMethod: string; status: string;
}
export interface SalariesReportResult extends ReportSummary {
  rows: SalariesReportRow[];
  summary: { salaryCount: number; recordedAmount: string; approvedAmount: string; pendingAmount: string; reversedAmount: string };
}

export interface OutstandingInvoicesRow {
  invoiceId: string; invoiceNumber: string; date: string;
  customerId: string; customerName: string; orderId: string; orderNumber: string;
  total: string; amountPaid: string; outstanding: string; paymentStatus: string;
}
export interface OutstandingInvoicesResult extends ReportSummary {
  rows: OutstandingInvoicesRow[];
  summary: { invoiceCount: number; totalInvoiced: string; totalPaid: string; totalOutstanding: string };
}

export interface BillingSummaryResult extends ReportSummary {
  invoicedAmount: string; paymentsReceived: string; currentCustomerOutstanding: string;
  expensesAmount: string; approvedSalariesAmount: string;
  purchasesAmount: string; approvedPurchasePayments: string; currentSupplierOutstanding: string;
  chart: { label: string; invoiced: string; received: string; expenses: string; salaries: string }[];
}

export async function fetchExpensesReport(params: ReportQueryParams) {
  const { data } = await api.get<ExpensesReportResult>('/reports/expenses', { query: toParams(params) });
  return data;
}
export async function fetchSalariesReport(params: ReportQueryParams) {
  const { data } = await api.get<SalariesReportResult>('/reports/salaries', { query: toParams(params) });
  return data;
}
export async function fetchOutstandingInvoicesReport(params: ReportQueryParams) {
  const { data } = await api.get<OutstandingInvoicesResult>('/reports/outstanding-invoices', { query: toParams(params) });
  return data;
}
export async function fetchBillingSummary(params: ReportQueryParams) {
  const { data } = await api.get<BillingSummaryResult>('/reports/billing-summary', { query: toParams(params) });
  return data;
}
