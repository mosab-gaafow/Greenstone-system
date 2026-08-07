export interface DashboardData {
  kpis: {
    activeOrders: number; pendingDeliveries: number; overdueInvoices: number;
    lowStockMaterials: number; totalFinishedStock: number; pendingPayments: number;
    pendingSalaryApprovals: number; customersWithCredit: number;
  };
  financialSummary: {
    totalInvoiced: string; paymentsReceived: string; outstandingAmount: string; totalExpenses: string;
  };
  chart: { label: string; invoiced: string; received: string }[];
  stockByProduct: { name: string; physical: number; reserved: number; available: number }[];
  topOrders: {
    rank: number; orderId: string; orderNumber: string; date: string;
    customerId: string; customerName: string; total: string;
    amountPaid: string; outstanding: string;
    paymentStatus: string; orderStatus: string;
  }[];
  topCustomersByPayments: {
    rank: number; customerId: string; customerName: string;
    paymentCount: number; orderCount: number; totalInvoiced: string;
    paymentsReceived: string; outstanding: string;
  }[];
  invoiceStatus: { fullyPaid: number; partiallyPaid: number; unpaid: number };
  periodLabel: string;
}

export interface DashboardQuery {
  from: Date;
  to: Date;
}
