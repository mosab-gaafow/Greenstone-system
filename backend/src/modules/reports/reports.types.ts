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
