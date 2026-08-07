import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as svc from './reports.service.js';
import type {
  OrdersReportQuery, TopOrdersQuery, TopCustomersQuery,
  CustomerBalancesQuery,
  InvoicesReportQuery, PaymentsReportQuery, ReceiptsReportQuery,
  ProductionReportQuery, CuringReportQuery, DeliveriesReportQuery,
  StockReportQuery, StockMovementQuery,
  PurchasesReportQuery, PurchasePaymentsReportQuery, SuppliersReportQuery,
  ExpensesReportQuery, SalariesReportQuery, OutstandingInvoicesQuery,
  BillingSummaryQuery,
} from './reports.types.js';

export async function ordersReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.ordersReport(getValidatedQuery<OrdersReportQuery>(res))); } catch (e) { next(e); }
}
export async function topOrders(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.topOrdersReport(getValidatedQuery<TopOrdersQuery>(res))); } catch (e) { next(e); }
}
export async function topCustomers(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.topCustomersReport(getValidatedQuery<TopCustomersQuery>(res))); } catch (e) { next(e); }
}
export async function customerBalances(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.customerBalancesReport(getValidatedQuery<CustomerBalancesQuery>(res))); } catch (e) { next(e); }
}
export async function invoicesReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.invoicesReport(getValidatedQuery<InvoicesReportQuery>(res))); } catch (e) { next(e); }
}
export async function paymentsReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.paymentsReport(getValidatedQuery<PaymentsReportQuery>(res))); } catch (e) { next(e); }
}
export async function receiptsReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.receiptsReport(getValidatedQuery<ReceiptsReportQuery>(res))); } catch (e) { next(e); }
}

// ── Phase 11C2: Operations ────────────────────────────────────────

export async function productionReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.productionReport(getValidatedQuery<ProductionReportQuery>(res))); } catch (e) { next(e); }
}
export async function curingReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.curingReport(getValidatedQuery<CuringReportQuery>(res))); } catch (e) { next(e); }
}
export async function deliveriesReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.deliveriesReport(getValidatedQuery<DeliveriesReportQuery>(res))); } catch (e) { next(e); }
}

// ── Phase 11C2: Stock ─────────────────────────────────────────────

export async function finishedStockReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.finishedStockReport(getValidatedQuery<StockReportQuery>(res))); } catch (e) { next(e); }
}
export async function reservedStockReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.reservedStockReport(getValidatedQuery<StockReportQuery>(res))); } catch (e) { next(e); }
}
export async function availableStockReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.availableStockReport(getValidatedQuery<StockReportQuery>(res))); } catch (e) { next(e); }
}
export async function lowStockReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.lowStockReport(getValidatedQuery<StockReportQuery>(res))); } catch (e) { next(e); }
}
export async function stockMovementReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.stockMovementReport(getValidatedQuery<StockMovementQuery>(res))); } catch (e) { next(e); }
}

// ── Phase 11C3: Purchasing ────────────────────────────────────────

export async function purchasesReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.purchasesReport(getValidatedQuery<PurchasesReportQuery>(res))); } catch (e) { next(e); }
}
export async function purchasePaymentsReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.purchasePaymentsReport(getValidatedQuery<PurchasePaymentsReportQuery>(res))); } catch (e) { next(e); }
}
export async function suppliersReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.suppliersReport(getValidatedQuery<SuppliersReportQuery>(res))); } catch (e) { next(e); }
}

// ── Phase 11C4: Finance ───────────────────────────────────────────

export async function expensesReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.expensesReport(getValidatedQuery<ExpensesReportQuery>(res))); } catch (e) { next(e); }
}
export async function salariesReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.salariesReport(getValidatedQuery<SalariesReportQuery>(res))); } catch (e) { next(e); }
}
export async function outstandingInvoicesReport(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.outstandingInvoicesReport(getValidatedQuery<OutstandingInvoicesQuery>(res))); } catch (e) { next(e); }
}
export async function billingSummary(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await svc.billingSummary(getValidatedQuery<BillingSummaryQuery>(res))); } catch (e) { next(e); }
}
