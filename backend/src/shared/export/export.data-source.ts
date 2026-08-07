/* eslint-disable @typescript-eslint/no-explicit-any */
import * as reportsService from '../../modules/reports/reports.service.js';
import * as ordersService from '../../modules/orders/orders.service.js';
import * as customersService from '../../modules/customers/customers.service.js';
import * as invoicesService from '../../modules/invoices/invoices.service.js';
import * as customerPaymentsService from '../../modules/customer-payments/customer-payments.service.js';
import * as receiptsService from '../../modules/receipts/receipts.service.js';
import * as expensesService from '../../modules/expenses/expenses.service.js';
import * as employeesService from '../../modules/employees/employees.service.js';
import * as salariesService from '../../modules/salaries/salaries.service.js';
import * as suppliersService from '../../modules/suppliers/suppliers.service.js';
import * as purchasesService from '../../modules/purchases/purchases.service.js';
import * as purchasePaymentsService from '../../modules/purchase-payments/purchase-payments.service.js';
import * as productionService from '../../modules/production/production.service.js';
import * as deliveriesService from '../../modules/deliveries/deliveries.service.js';
import * as finishedStockService from '../../modules/finished-stock/finished-stock.service.js';
import { REPORT_COLUMNS, LIST_COLUMNS } from './export.columns.js';
import type { ExportData, ExportRequest } from './export.types.js';

// ── Report sources ────────────────────────────────────────────────

async function reportSource(source: string, req: ExportRequest): Promise<ExportData> {
  const reportKey = source; // "reports/orders", "reports/invoices", etc.
  const query: any = {
    from: new Date(req.from ?? '2020-01-01'),
    to: new Date(req.to ?? new Date().toISOString().split('T')[0]!),
  };
  if (req.search) query.search = req.search;
  if (req.status) query.status = req.status;
  if (req.orderStatus) query.orderStatus = req.orderStatus;
  if (req.invoiceStatus) query.invoiceStatus = req.invoiceStatus;
  if (req.paymentStatus) query.paymentStatus = req.paymentStatus;
  if (req.paymentMethod) query.paymentMethod = req.paymentMethod;
  if (req.receiptStatus) query.receiptStatus = req.receiptStatus;
  if (req.category) query.category = req.category;
  if (req.salaryType) query.salaryType = req.salaryType;
  if (req.movementType) query.movementType = req.movementType;
  if (req.supplierId) query.supplierId = req.supplierId;
  if (req.customerId) query.customerId = req.customerId;
  if (req.balanceFilter) query.balanceFilter = req.balanceFilter;
  if (req.limit) query.limit = req.limit;
  if (req.groupBy) query.groupBy = req.groupBy;

  const mapping: Record<string, () => Promise<any>> = {
    'reports/orders': () => reportsService.ordersReport(query),
    'reports/top-orders': () => reportsService.topOrdersReport(query),
    'reports/top-customers': () => reportsService.topCustomersReport(query),
    'reports/customer-balances': () => reportsService.customerBalancesReport({ search: req.search, balanceFilter: req.balanceFilter } as any),
    'reports/invoices': () => reportsService.invoicesReport(query),
    'reports/payments': () => reportsService.paymentsReport(query),
    'reports/receipts': () => reportsService.receiptsReport(query),
    'reports/production': () => reportsService.productionReport(query),
    'reports/curing': () => reportsService.curingReport(query),
    'reports/deliveries': () => reportsService.deliveriesReport(query),
    'reports/finished-stock': () => reportsService.finishedStockReport({ search: req.search } as any),
    'reports/reserved-stock': () => reportsService.reservedStockReport({ search: req.search } as any),
    'reports/available-stock': () => reportsService.availableStockReport({ search: req.search } as any),
    'reports/low-stock': () => reportsService.lowStockReport({ search: req.search } as any),
    'reports/stock-movement': () => reportsService.stockMovementReport(query),
    'reports/purchases': () => reportsService.purchasesReport(query),
    'reports/purchase-payments': () => reportsService.purchasePaymentsReport(query),
    'reports/suppliers': () => reportsService.suppliersReport({ search: req.search, balanceFilter: req.balanceFilter } as any),
    'reports/expenses': () => reportsService.expensesReport(query),
    'reports/salaries': () => reportsService.salariesReport(query),
    'reports/outstanding-invoices': () => reportsService.outstandingInvoicesReport(query),
    'reports/billing-summary': () => reportsService.billingSummary(query),
  };

  const fn = mapping[reportKey];
  if (!fn) throw new Error(`Unknown report source: ${reportKey}`);
  const result = await fn();
  return {
    rows: result.rows ?? result.chart ?? [],
    columns: REPORT_COLUMNS[reportKey] ?? [],
    title: reportName(reportKey),
    subtitle: result.periodLabel ?? '',
    totals: result.summary ?? undefined,
  };
}

// ── List sources ──────────────────────────────────────────────────

async function listSource(source: string, req: ExportRequest): Promise<ExportData> {
  const common: any = { page: 1, pageSize: 10000 };
  if (req.search) common.search = req.search;
  if (req.status) common.status = req.status;
  if (req.paymentMethod) common.paymentMethod = req.paymentMethod;
  if (req.salaryType) common.salaryType = req.salaryType;
  if (req.customerId) common.customerId = req.customerId;

  const mapping: Record<string, () => Promise<any>> = {
    orders: () => ordersService.listOrders(common),
    customers: () => customersService.listCustomers(common),
    invoices: () => invoicesService.listInvoices(common),
    payments: () => customerPaymentsService.listPayments(common),
    receipts: () => receiptsService.listReceipts(common),
    expenses: () => expensesService.listExpenses(common),
    employees: () => employeesService.listEmployees(common),
    salaries: () => salariesService.listSalaries(common),
    suppliers: () => suppliersService.listSuppliers(common),
    purchases: () => purchasesService.listPurchases(common),
    'purchase-payments': () => purchasePaymentsService.listPurchasePayments(common),
    production: () => productionService.listProduction(common),
    deliveries: () => deliveriesService.listDeliveries(common),
    stock: () => finishedStockService.listAllStock(),
  };

  const fn = mapping[source];
  if (!fn) throw new Error(`Unknown list source: ${source}`);
  const result = await fn();
  const rows = (result as any).items ?? (result as any).orders ?? (result as any).customers ??
    (result as any).invoices ?? (result as any).payments ?? (result as any).receipts ??
    (result as any).expenses ?? (result as any).employees ?? (result as any).salaries ??
    (result as any).suppliers ?? (result as any).purchases ?? (result as any).purchasePayments ??
    (result as any).batches ?? (result as any).deliveries ?? (result as any).balances ?? [];
  return {
    rows,
    columns: LIST_COLUMNS[source] ?? [],
    title: listName(source),
  };
}

// ── Main dispatcher ────────────────────────────────────────────────

export async function fetchExportData(req: ExportRequest): Promise<ExportData> {
  if (req.source.startsWith('reports/')) {
    return reportSource(req.source, req);
  }
  return listSource(req.source, req);
}

// ── Titles ─────────────────────────────────────────────────────────

function reportName(key: string): string {
  const map: Record<string, string> = {
    'reports/orders': 'Orders Report', 'reports/top-orders': 'Top Orders by Value',
    'reports/top-customers': 'Top Customers by Payments', 'reports/customer-balances': 'Customer Balances',
    'reports/invoices': 'Invoices Report', 'reports/payments': 'Payments Report',
    'reports/receipts': 'Receipts Report', 'reports/production': 'Production Report',
    'reports/curing': 'Curing Report', 'reports/deliveries': 'Deliveries Report',
    'reports/finished-stock': 'Finished Stock Report', 'reports/reserved-stock': 'Reserved Stock Report',
    'reports/available-stock': 'Available Stock Report', 'reports/low-stock': 'Low Stock Report',
    'reports/stock-movement': 'Stock Movement Report', 'reports/purchases': 'Purchases Report',
    'reports/purchase-payments': 'Purchase Payments Report', 'reports/suppliers': 'Supplier Report',
    'reports/expenses': 'Expenses Report', 'reports/salaries': 'Salaries Report',
    'reports/outstanding-invoices': 'Outstanding Invoices Report', 'reports/billing-summary': 'Billing Summary',
  };
  return map[key] ?? key;
}

function listName(key: string): string {
  const map: Record<string, string> = {
    orders: 'Orders', customers: 'Customers', invoices: 'Invoices',
    payments: 'Payments', receipts: 'Receipts', expenses: 'Expenses',
    employees: 'Employees', salaries: 'Salaries', suppliers: 'Suppliers',
    purchases: 'Purchases', 'purchase-payments': 'Purchase Payments',
    production: 'Production', deliveries: 'Deliveries', stock: 'Finished Stock',
  };
  return map[key] ?? key;
}
