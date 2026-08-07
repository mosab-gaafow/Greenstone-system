import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as svc from './reports.service.js';
import type {
  OrdersReportQuery, TopOrdersQuery, TopCustomersQuery,
  CustomerBalancesQuery,
  InvoicesReportQuery, PaymentsReportQuery, ReceiptsReportQuery,
} from './reports.types.js';

export async function ordersReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.ordersReport(getValidatedQuery<OrdersReportQuery>(res))); } catch (e) { next(e); }
}
export async function topOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.topOrdersReport(getValidatedQuery<TopOrdersQuery>(res))); } catch (e) { next(e); }
}
export async function topCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.topCustomersReport(getValidatedQuery<TopCustomersQuery>(res))); } catch (e) { next(e); }
}
export async function customerBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.customerBalancesReport(getValidatedQuery<CustomerBalancesQuery>(res))); } catch (e) { next(e); }
}
export async function invoicesReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.invoicesReport(getValidatedQuery<InvoicesReportQuery>(res))); } catch (e) { next(e); }
}
export async function paymentsReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.paymentsReport(getValidatedQuery<PaymentsReportQuery>(res))); } catch (e) { next(e); }
}
export async function receiptsReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.receiptsReport(getValidatedQuery<ReceiptsReportQuery>(res))); } catch (e) { next(e); }
}
