import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { validate } from '../../shared/validation/validate.js';
import * as ctrl from './reports.controller.js';
import {
  ordersReportSchema, topOrdersSchema, topCustomersSchema,
  customerBalancesSchema, invoicesReportSchema,
  paymentsReportSchema, receiptsReportSchema,
  productionReportSchema, curingReportSchema, deliveriesReportSchema,
  finishedStockSchema, reservedStockSchema, availableStockSchema,
  lowStockSchema, stockMovementReportSchema,
  purchasesReportSchema, purchasePaymentsReportSchema, suppliersReportSchema,
  expensesReportSchema, salariesReportSchema, outstandingInvoicesSchema, billingSummarySchema,
} from './reports.validators.js';

export function reportsRoutes(): Router {
  const r = Router();
  r.use(requireAuth());
  r.use(requirePermission('report', 'read-operational'));

  // Phase 11C1: Sales & Customers
  r.get('/orders', validate({ query: ordersReportSchema }), ctrl.ordersReport);
  r.get('/top-orders', validate({ query: topOrdersSchema }), ctrl.topOrders);
  r.get('/top-customers', validate({ query: topCustomersSchema }), ctrl.topCustomers);
  r.get('/customer-balances', validate({ query: customerBalancesSchema }), ctrl.customerBalances);
  r.get('/invoices', validate({ query: invoicesReportSchema }), ctrl.invoicesReport);
  r.get('/payments', validate({ query: paymentsReportSchema }), ctrl.paymentsReport);
  r.get('/receipts', validate({ query: receiptsReportSchema }), ctrl.receiptsReport);

  // Phase 11C2: Operations
  r.get('/production', validate({ query: productionReportSchema }), ctrl.productionReport);
  r.get('/curing', validate({ query: curingReportSchema }), ctrl.curingReport);
  r.get('/deliveries', validate({ query: deliveriesReportSchema }), ctrl.deliveriesReport);

  // Phase 11C2: Stock
  r.get('/finished-stock', validate({ query: finishedStockSchema }), ctrl.finishedStockReport);
  r.get('/reserved-stock', validate({ query: reservedStockSchema }), ctrl.reservedStockReport);
  r.get('/available-stock', validate({ query: availableStockSchema }), ctrl.availableStockReport);
  r.get('/low-stock', validate({ query: lowStockSchema }), ctrl.lowStockReport);
  r.get('/stock-movement', validate({ query: stockMovementReportSchema }), ctrl.stockMovementReport);

  // Phase 11C3: Purchasing
  r.get('/purchases', validate({ query: purchasesReportSchema }), ctrl.purchasesReport);
  r.get('/purchase-payments', validate({ query: purchasePaymentsReportSchema }), ctrl.purchasePaymentsReport);
  r.get('/suppliers', validate({ query: suppliersReportSchema }), ctrl.suppliersReport);

  // Phase 11C4: Finance
  r.get('/expenses', validate({ query: expensesReportSchema }), ctrl.expensesReport);
  r.get('/salaries', validate({ query: salariesReportSchema }), ctrl.salariesReport);
  r.get('/outstanding-invoices', validate({ query: outstandingInvoicesSchema }), ctrl.outstandingInvoicesReport);
  r.get('/billing-summary', validate({ query: billingSummarySchema }), ctrl.billingSummary);

  return r;
}
