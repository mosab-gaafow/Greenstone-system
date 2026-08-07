import { Router } from 'express';
import { requireAuth } from '../../shared/auth/session.middleware.js';
import { requirePermission } from '../../shared/auth/permission.middleware.js';
import { validate } from '../../shared/validation/validate.js';
import * as ctrl from './reports.controller.js';
import {
  ordersReportSchema, topOrdersSchema, topCustomersSchema,
  customerBalancesSchema, invoicesReportSchema,
  paymentsReportSchema, receiptsReportSchema,
} from './reports.validators.js';

export function reportsRoutes(): Router {
  const r = Router();
  r.use(requireAuth());
  r.use(requirePermission('report', 'read-operational'));

  r.get('/orders', validate({ query: ordersReportSchema }), ctrl.ordersReport);
  r.get('/top-orders', validate({ query: topOrdersSchema }), ctrl.topOrders);
  r.get('/top-customers', validate({ query: topCustomersSchema }), ctrl.topCustomers);
  r.get('/customer-balances', validate({ query: customerBalancesSchema }), ctrl.customerBalances);
  r.get('/invoices', validate({ query: invoicesReportSchema }), ctrl.invoicesReport);
  r.get('/payments', validate({ query: paymentsReportSchema }), ctrl.paymentsReport);
  r.get('/receipts', validate({ query: receiptsReportSchema }), ctrl.receiptsReport);

  return r;
}
