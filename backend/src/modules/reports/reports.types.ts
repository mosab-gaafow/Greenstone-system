// ── Report query params ─────────────────────────────────────────────

export interface ReportQuery {
  from: Date;
  to: Date;
}

export interface OrdersReportQuery extends ReportQuery {
  search?: string;
  customerId?: string;
  orderStatus?: string;
}

export interface TopOrdersQuery extends ReportQuery {
  search?: string;
  limit?: number;
}

export interface TopCustomersQuery extends ReportQuery {
  search?: string;
  limit?: number;
}

export interface CustomerBalancesQuery {
  search?: string;
  balanceFilter?: 'all' | 'has-outstanding' | 'zero-balance';
}

export interface InvoicesReportQuery extends ReportQuery {
  search?: string;
  customerId?: string;
  invoiceStatus?: string;
  paymentStatus?: string;
}

export interface PaymentsReportQuery extends ReportQuery {
  search?: string;
  customerId?: string;
  paymentStatus?: string;
  paymentMethod?: string;
}

export interface ReceiptsReportQuery extends ReportQuery {
  search?: string;
  customerId?: string;
  receiptStatus?: string;
  paymentMethod?: string;
}

// ── Report result types ────────────────────────────────────────────

export interface OrdersReportRow {
  orderId: string;
  orderNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  itemCount: number;
  total: string;
  amountPaid: string;
  outstanding: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}

export interface OrdersReportResult {
  rows: OrdersReportRow[];
  summary: {
    orderCount: number;
    totalValue: string;
    totalPaid: string;
    totalOutstanding: string;
  };
  periodLabel: string;
}

export interface TopOrdersRow {
  rank: number;
  orderId: string;
  orderNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  total: string;
  amountPaid: string;
  outstanding: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}

export interface TopOrdersResult {
  rows: TopOrdersRow[];
  periodLabel: string;
}

export interface TopCustomersRow {
  rank: number;
  customerId: string;
  customerName: string;
  orderCount: number;
  paymentCount: number;
  totalInvoiced: string;
  paymentsReceived: string;
  outstanding: string;
}

export interface TopCustomersResult {
  rows: TopCustomersRow[];
  periodLabel: string;
}

export interface CustomerBalanceRow {
  customerId: string;
  customerName: string;
  phone: string | null;
  openingBalance: string;
  totalInvoiced: string;
  approvedPayments: string;
  outstanding: string;
  creditStatus: string;
}

export interface CustomerBalancesResult {
  rows: CustomerBalanceRow[];
  summary: {
    totalOutstanding: string;
    customerCount: number;
  };
}

export interface InvoicesReportRow {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  total: string;
  amountPaid: string;
  outstanding: string;
  invoiceStatus: string;
  paymentStatus: string;
}

export interface InvoicesReportResult {
  rows: InvoicesReportRow[];
  summary: {
    invoiceCount: number;
    issuedValue: string;
    amountPaid: string;
    validOutstanding: string;
    voidedValue: string;
    voidedCount: number;
  };
  periodLabel: string;
}

export interface PaymentsReportRow {
  paymentId: string;
  paymentNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  amount: string;
  method: string;
  reference: string | null;
  status: string;
  invoiceNumbers: string[];
  receiptNumber: string | null;
  hasEvidence: boolean;
}

export interface PaymentsReportResult {
  rows: PaymentsReportRow[];
  summary: {
    paymentCount: number;
    recordedAmount: string;
    approvedAmount: string;
    pendingAmount: string;
    reversedAmount: string;
  };
  periodLabel: string;
}

export interface ReceiptsReportRow {
  receiptId: string;
  receiptNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  paymentNumber: string;
  invoiceNumber: string | null;
  amount: string;
  paymentMethod: string;
  status: string;
}

export interface ReceiptsReportResult {
  rows: ReceiptsReportRow[];
  summary: {
    receiptCount: number;
    activeAmount: string;
    activeCount: number;
    voidedAmount: string;
    voidedCount: number;
  };
  periodLabel: string;
}

// ── Phase 11C2: Operations ────────────────────────────────────────

export interface ProductionReportQuery extends ReportQuery {
  search?: string;
  status?: string;
}

export interface ProductionReportRow {
  batchId: string;
  productionNumber: string;
  date: string;
  purpose: string;
  orderNumber: string | null;
  status: string;
  productCount: number;
  totalProduced: number;
  totalBroken: number;
  totalUsable: number;
}

export interface ProductionReportResult {
  rows: ProductionReportRow[];
  summary: { batchCount: number; totalProduced: number; totalBroken: number; totalUsable: number };
  periodLabel: string;
}

export interface CuringReportQuery extends ReportQuery {
  search?: string;
  productId?: string;
}

export interface CuringReportRow {
  curingId: string;
  batchId: string;
  productionNumber: string;
  productName: string;
  quantityEntering: number;
  duration: string;
  startedAt: string;
  plannedCompletion: string;
  actualRelease: string | null;
  brokenQuantity: number;
  releasedQuantity: number | null;
  isReleased: boolean;
}

export interface CuringReportResult {
  rows: CuringReportRow[];
  summary: { recordCount: number; totalEntering: number; totalReleased: number; pendingCount: number; pendingQuantity: number };
  periodLabel: string;
}

export interface DeliveriesReportQuery extends ReportQuery {
  search?: string;
  status?: string;
}

export interface DeliveriesReportRow {
  deliveryId: string;
  deliveryNumber: string;
  date: string;
  orderNumber: string;
  customerName: string;
  driverName: string;
  vehicleReg: string;
  status: string;
  itemCount: number;
  totalQuantity: number;
  transportCost: string | null;
}

export interface DeliveriesReportResult {
  rows: DeliveriesReportRow[];
  summary: {
    tripCount: number; plannedCount: number; dispatchedCount: number; deliveredCount: number;
    plannedQty: number; dispatchedQty: number; deliveredQty: number;
    actualTransportCost: string;
    plannedTransportCost: string;
  };
  periodLabel: string;
}

// ── Phase 11C2: Stock ─────────────────────────────────────────────

export interface StockReportQuery {
  search?: string;
}

export interface FinishedStockRow {
  productId: string;
  productName: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

export interface FinishedStockResult {
  rows: FinishedStockRow[];
  summary: { productCount: number; totalPhysical: number; totalReserved: number; totalAvailable: number };
}

export interface LowStockRow {
  productId: string;
  productName: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
}

export interface LowStockResult {
  rows: LowStockRow[];
  summary: { productCount: number; totalAvailable: number };
}

export interface StockMovementQuery extends ReportQuery {
  search?: string;
  movementType?: string;
}

export interface StockMovementRow {
  movementId: string;
  date: string;
  productName: string;
  movementType: string;
  quantity: number;
  quantityIn: number;
  quantityOut: number;
  balanceAfter: number;
  reason: string | null;
  referenceLabel: string | null;
  referenceHref: string | null;
}

export interface StockMovementResult {
  rows: StockMovementRow[];
  summary: { movementCount: number; totalIn: number; totalOut: number };
  periodLabel: string;
}
