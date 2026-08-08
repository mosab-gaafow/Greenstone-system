import {
  findActiveOrdersByCustomerId,
  findAddressByLabel,
  findAddressById,
  findCustomerByEmail,
  findCustomerByPhone,
  findCustomerById,
  findCustomers,
  findOpeningBalanceAmount,
  insertAddress,
  insertCustomer,
  setAddressActive,
  setCustomerActive,
  updateAddress,
  updateCustomer,
  type AddressRow,
  type CustomerRow,
  type CustomerWithAddresses,
} from './customers.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import * as deliveriesService from '../deliveries/deliveries.service.js';
import { computeCreditStatus } from '../customer-credit/customer-credit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import {
  BusinessRuleViolationError,
  CustomerDeactivationBlockedError,
  ResourceNotFoundError,
} from '../../shared/errors/app-error.js';
import type {
  ActiveOrderSummary,
  CreateAddressInput,
  CreateCustomerInput,
  CustomerAddressSummary,
  CustomerDetail,
  CustomerSummary,
  ForceDeactivateCustomerInput,
  ListCustomersFilters,
  ListCustomersResult,
  UpdateAddressInput,
  UpdateCustomerInput,
} from './customers.types.js';

/**
 * Customer and address business logic.
 *
 * Addresses belong to the customers domain rather than a module of their own,
 * per technical-blueprint section 3.3.
 *
 * The rule enforced hardest here is ownership: an address always belongs to
 * exactly one customer, and every address operation checks that the address in
 * the URL really belongs to the customer in the URL. Without that check, a
 * guessed id could move or read another customer's site.
 */

const AUDIT_MODULE = 'customers';
const CACHE_MODULE = 'customers';
const LIST_TTL_SECONDS = 300;

export async function listCustomers(filters: ListCustomersFilters): Promise<ListCustomersResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findCustomers(filters);

    return {
      customers: rows.map((row) => toSummary(row, row._count.addresses)),
      totalRecords: total,
    };
  });
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const customer = await requireCustomer(id);

  return {
    ...toSummary(customer, customer.addresses.filter((address) => address.isActive).length),
    addresses: customer.addresses.map(toAddressSummary),
  };
}

export async function createCustomer(
  input: CreateCustomerInput,
  context: RequestContext,
): Promise<CustomerDetail> {
  await assertPhoneAvailable(input.phone);
  await assertEmailAvailable(input.email);

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const customer = await insertCustomer(input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_CUSTOMER',
      module: AUDIT_MODULE,
      entityType: 'Customer',
      entityId: customer.id,
      updatedData: toAuditSnapshot(customer),
    });

    return customer;
  });

  await invalidateCustomerCache();

  return getCustomer(created.id);
}

export async function editCustomer(
  id: string,
  input: UpdateCustomerInput,
  context: RequestContext,
): Promise<CustomerDetail> {
  const existing = await requireCustomer(id);

  if (input.phone !== undefined) {
    await assertPhoneAvailable(input.phone, id);
  }
  if (input.email !== undefined) {
    await assertEmailAvailable(input.email, id);
  }

  await runInTransaction(async (tx: TransactionClient) => {
    const customer = await updateCustomer(id, input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_CUSTOMER',
      module: AUDIT_MODULE,
      entityType: 'Customer',
      entityId: id,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(customer),
    });
  });

  await invalidateCustomerCache();

  return getCustomer(id);
}

export async function activateCustomer(
  id: string,
  context: RequestContext,
): Promise<CustomerDetail> {
  return changeCustomerActiveState(id, true, context);
}

/**
 * Normal deactivation — blocked unless every deactivation safeguard passes
 * (Phase 6E addendum, business-blueprint section 2.2/2.24). Never silent:
 * a failing condition always rejects with a clear business error.
 */
export async function deactivateCustomer(
  id: string,
  context: RequestContext,
): Promise<CustomerDetail> {
  await assertCustomerDeactivatable(id);

  return changeCustomerActiveState(id, false, context);
}

/**
 * Customers are never deleted, only activated and deactivated, because orders,
 * invoices and payments reference them permanently.
 */
async function changeCustomerActiveState(
  id: string,
  isActive: boolean,
  context: RequestContext,
): Promise<CustomerDetail> {
  const existing = await requireCustomer(id);

  if (existing.isActive === isActive) {
    throw new BusinessRuleViolationError(
      isActive ? 'This customer is already active.' : 'This customer is already inactive.',
    );
  }

  await runInTransaction(async (tx: TransactionClient) => {
    await setCustomerActive(id, isActive, null, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: isActive ? 'ACTIVATE_CUSTOMER' : 'DEACTIVATE_CUSTOMER',
      module: AUDIT_MODULE,
      entityType: 'Customer',
      entityId: id,
      previousData: { isActive: existing.isActive },
      updatedData: { isActive },
    });
  });

  await invalidateCustomerCache();

  return getCustomer(id);
}

/**
 * Force-deactivation (Phase 6E addendum) — Super Admin/Admin only
 * (`customer:force-deactivate`, checked by route middleware, not here).
 * Deliberately skips `assertCustomerDeactivatable` — that is the entire
 * point of "force" — but still requires a written reason, and always
 * records a full snapshot (previous status, active-order summary,
 * outstanding balance) in the audit log. Never auto-cancels active Orders,
 * auto-releases stock reservations, or auto-erases the outstanding balance
 * — those remain separate, deliberate actions by an authorised user.
 */
export async function forceDeactivateCustomer(
  id: string,
  input: ForceDeactivateCustomerInput,
  context: RequestContext,
): Promise<CustomerDetail> {
  const existing = await requireCustomer(id);

  if (!existing.isActive) {
    throw new BusinessRuleViolationError('This customer is already inactive.');
  }

  const reason = input.reason.trim();
  const [activeOrders, openingBalance] = await Promise.all([
    findActiveOrdersByCustomerId(id),
    findOpeningBalanceAmount(id),
  ]);

  await runInTransaction(async (tx: TransactionClient) => {
    await setCustomerActive(id, false, reason, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'FORCE_DEACTIVATE_CUSTOMER',
      module: AUDIT_MODULE,
      entityType: 'Customer',
      entityId: id,
      reason,
      previousData: {
        isActive: existing.isActive,
        activeOrders: formatActiveOrders(activeOrders),
        outstandingBalance: openingBalance.toFixed(2),
      },
      updatedData: { isActive: false, deactivationReason: reason },
    });
  });

  await invalidateCustomerCache();

  return getCustomer(id);
}

// --- Addresses --------------------------------------------------------------

export async function addAddress(
  customerId: string,
  input: CreateAddressInput,
  context: RequestContext,
): Promise<CustomerDetail> {
  await requireCustomer(customerId);
  await assertLabelAvailable(customerId, input.label);

  await runInTransaction(async (tx: TransactionClient) => {
    const address = await insertAddress(customerId, input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_CUSTOMER_ADDRESS',
      module: AUDIT_MODULE,
      entityType: 'CustomerAddress',
      entityId: address.id,
      updatedData: { customerId, ...toAddressAuditSnapshot(address) },
    });
  });

  await invalidateCustomerCache();

  return getCustomer(customerId);
}

export async function editAddress(
  customerId: string,
  addressId: string,
  input: UpdateAddressInput,
  context: RequestContext,
): Promise<CustomerDetail> {
  const existing = await requireAddressOfCustomer(customerId, addressId);

  if (input.label !== undefined && input.label !== existing.label) {
    await assertLabelAvailable(customerId, input.label);
  }

  await runInTransaction(async (tx: TransactionClient) => {
    const address = await updateAddress(addressId, input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_CUSTOMER_ADDRESS',
      module: AUDIT_MODULE,
      entityType: 'CustomerAddress',
      entityId: addressId,
      previousData: toAddressAuditSnapshot(existing),
      updatedData: toAddressAuditSnapshot(address),
    });
  });

  await invalidateCustomerCache();

  return getCustomer(customerId);
}

export async function setAddressActiveState(
  customerId: string,
  addressId: string,
  isActive: boolean,
  context: RequestContext,
): Promise<CustomerDetail> {
  const existing = await requireAddressOfCustomer(customerId, addressId);

  if (existing.isActive === isActive) {
    throw new BusinessRuleViolationError(
      isActive ? 'This address is already active.' : 'This address is already inactive.',
    );
  }

  await runInTransaction(async (tx: TransactionClient) => {
    await setAddressActive(addressId, isActive, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: isActive ? 'ACTIVATE_CUSTOMER_ADDRESS' : 'DEACTIVATE_CUSTOMER_ADDRESS',
      module: AUDIT_MODULE,
      entityType: 'CustomerAddress',
      entityId: addressId,
      previousData: { isActive: existing.isActive },
      updatedData: { isActive },
    });
  });

  await invalidateCustomerCache();

  return getCustomer(customerId);
}

// --- Helpers ----------------------------------------------------------------

async function requireCustomer(id: string): Promise<CustomerWithAddresses> {
  const customer = await findCustomerById(id);

  if (!customer) {
    throw new ResourceNotFoundError('That customer was not found.');
  }

  return customer;
}

/**
 * Loads an address and confirms it belongs to the given customer.
 *
 * A mismatch is reported as "not found" rather than "forbidden", so the reply
 * does not confirm that someone else's address id exists.
 */
async function requireAddressOfCustomer(
  customerId: string,
  addressId: string,
): Promise<AddressRow> {
  await requireCustomer(customerId);

  const address = await findAddressById(addressId);

  if (!address || address.customerId !== customerId) {
    throw new ResourceNotFoundError('That address was not found for this customer.');
  }

  return address;
}

/**
 * Rejects a phone number already on file.
 *
 * The comparison runs on the normalised value, so "0722123456",
 * "0722 123 456" and "+254722123456" are recognised as the same line. Without
 * that, the same customer could be entered several times just by changing the
 * spacing.
 *
 * `exceptId` lets a customer keep its own number while being edited.
 */
async function assertPhoneAvailable(phone: string, exceptId?: string): Promise<void> {
  const existing = await findCustomerByPhone(phone);

  if (existing && existing.id !== exceptId) {
    throw new BusinessRuleViolationError(`This phone number already belongs to ${existing.name}.`);
  }
}

/** Rejects an email address already on file, compared case-insensitively. */
async function assertEmailAvailable(
  email: string | null | undefined,
  exceptId?: string,
): Promise<void> {
  if (!email) {
    return;
  }

  const existing = await findCustomerByEmail(email);

  if (existing && existing.id !== exceptId) {
    throw new BusinessRuleViolationError(`This email address already belongs to ${existing.name}.`);
  }
}

/**
 * Site names must be unique per customer, so a driver reading "Kiambu Road
 * site" on a delivery is never choosing between two of them.
 */
async function assertLabelAvailable(customerId: string, label: string): Promise<void> {
  if (await findAddressByLabel(customerId, label)) {
    throw new BusinessRuleViolationError('This customer already has a site with that name.');
  }
}

/**
 * Normal-deactivation safeguards (Phase 6E addendum, extended Phase 8A,
 * corrected Phase 14.2 to use the live accounting balance instead of only
 * the static opening-balance row).
 *
 * Every Order must be COMPLETED/CANCELLED, the live accounting outstanding
 * balance (openingBalance + Σ ISSUED invoices − Σ APPROVED payment
 * allocations — the same formula customer-credit uses) must be exactly 0,
 * and there must be no PLANNED/DISPATCHED deliveries for this customer.
 */
async function assertCustomerDeactivatable(customerId: string): Promise<void> {
  const [activeOrders, creditStatus, hasActiveDeliveries] = await Promise.all([
    findActiveOrdersByCustomerId(customerId),
    computeCreditStatus(customerId),
    deliveriesService.hasActiveDeliveriesForCustomer(customerId),
  ]);

  const problems: string[] = [];

  if (activeOrders.length > 0) {
    problems.push(
      `${String(activeOrders.length)} active order(s) not yet completed or cancelled: ` +
        formatActiveOrders(activeOrders).join(', '),
    );
  }

  const outstandingBalance = new Prisma.Decimal(creditStatus.outstandingBalance);
  if (!outstandingBalance.isZero()) {
    problems.push(`an outstanding balance of KES ${outstandingBalance.toFixed(2)}`);
  }

  if (hasActiveDeliveries) {
    problems.push('this customer has unfinished (PLANNED or DISPATCHED) deliveries');
  }

  if (problems.length > 0) {
    throw new CustomerDeactivationBlockedError(
      `This customer cannot be deactivated: ${problems.join('; ')}.`,
    );
  }
}

function formatActiveOrders(orders: ActiveOrderSummary[]): string[] {
  return orders.map((order) => `${order.orderNumber} (${order.status})`);
}

/**
 * Invalidates every cached customer list entry.
 *
 * Exported so other modules can invalidate it after their own writes commit
 * — `customer-credit.service.ts`'s `setOpeningBalance` calls this, since the
 * customer list can filter by outstanding balance (Phase 6E).
 */
export async function invalidateCustomerCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListCustomersFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `a=${filters.isActive === undefined ? '' : String(filters.isActive)}`,
    `b=${filters.hasOutstandingBalance === undefined ? '' : String(filters.hasOutstandingBalance)}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: CustomerRow, addressCount: number): CustomerSummary {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    isActive: row.isActive,
    deactivationReason: row.deactivationReason,
    addressCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAddressSummary(row: AddressRow): CustomerAddressSummary {
  return {
    id: row.id,
    customerId: row.customerId,
    label: row.label,
    addressLine: row.addressLine,
    directions: row.directions,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: CustomerRow): Record<string, unknown> {
  return { name: row.name, phone: row.phone, email: row.email, isActive: row.isActive };
}

function toAddressAuditSnapshot(row: AddressRow): Record<string, unknown> {
  return {
    label: row.label,
    addressLine: row.addressLine,
    directions: row.directions,
    isActive: row.isActive,
  };
}

// --- Customer Statement -------------------------------------------------------

import { Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';

interface StatementTransaction {
  date: string;
  type: 'OPENING_BALANCE' | 'BROUGHT_FORWARD' | 'INVOICE' | 'PAYMENT';
  reference: string;
  description: string;
  relatedDocument: string;
  method: string;
  charge: string;
  payment: string;
  balance: string;
  status: string;
  paymentStatus: string;
}

export interface CustomerStatement {
  customer: { id: string; name: string; phone: string | null };
  from: string | null;
  to: string | null;
  openingBalance: string;
  totalInvoiced: string;
  totalPaid: string;
  closingBalance: string;
  transactions: StatementTransaction[];
}

export async function getCustomerStatement(
  customerId: string,
  from: Date | undefined,
  to: Date | undefined,
): Promise<CustomerStatement> {
  const prisma = getPrisma();
  const { ResourceNotFoundError } = await import('../../shared/errors/app-error.js');

  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true, phone: true } });
  if (!customer) throw new ResourceNotFoundError('Customer not found.');

  const ob = await prisma.customerOpeningBalance.findUnique({ where: { customerId } });
  const customerOpeningBalance = ob ? ob.amount : new Prisma.Decimal(0);

  // Build `to` end-of-day: add 1 day, use < (inclusive full day).
  const toEnd = to ? new Date(to.getTime() + 86400000) : undefined;

  // ---- Fetch ALL transactions (before + during range) ----
  // We fetch everything so we can compute the brought-forward balance
  // and the in-range transactions separately.
  const allInvoices = await prisma.invoice.findMany({
    where: { customerId, status: 'ISSUED' },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, invoiceNumber: true, totalAmount: true, createdAt: true, order: { select: { orderNumber: true } } },
  });

  const allAllocations = await prisma.customerPaymentAllocation.findMany({
    where: { invoice: { customerId }, payment: { status: 'APPROVED' } },
    orderBy: [{ payment: { approvedAt: 'asc' } }, { id: 'asc' }],
    select: {
      id: true, amount: true,
      payment: { select: { paymentNumber: true, approvedAt: true, paymentMethod: true, paymentReference: true, receipt: { select: { receiptNumber: true } } } },
      invoice: { select: { invoiceNumber: true, order: { select: { orderNumber: true } } } },
    },
  });

  // Separate into before-range and in-range
  const isBefore = (d: Date) => from ? d < from : false;
  const isAfter = (d: Date) => toEnd ? d >= toEnd : false;

  let beforeInvoices = new Prisma.Decimal(0);
  let beforePayments = new Prisma.Decimal(0);
  let running = customerOpeningBalance;

  const txns: { date: Date; type: 'INVOICE' | 'PAYMENT'; reference: string; related: string; method: string; charge: Prisma.Decimal; payment: Prisma.Decimal; status: string }[] = [];

  for (const inv of allInvoices) {
    if (isBefore(inv.createdAt)) { beforeInvoices = beforeInvoices.add(inv.totalAmount); continue; }
    if (isAfter(inv.createdAt)) continue;
    txns.push({ date: inv.createdAt, type: 'INVOICE', reference: inv.invoiceNumber, related: inv.order.orderNumber, method: '', charge: inv.totalAmount, payment: new Prisma.Decimal(0), status: 'ISSUED' });
  }
  for (const alloc of allAllocations) {
    const d = alloc.payment.approvedAt ?? new Date(0);
    if (isBefore(d)) { beforePayments = beforePayments.add(alloc.amount); continue; }
    if (isAfter(d)) continue;
    txns.push({ date: d, type: 'PAYMENT', reference: alloc.payment.paymentNumber, related: alloc.invoice.invoiceNumber, method: alloc.payment.paymentMethod, charge: new Prisma.Decimal(0), payment: alloc.amount, status: 'APPROVED' });
  }

  txns.sort((a, b) => a.date.getTime() - b.date.getTime() || a.reference.localeCompare(b.reference));

  const broughtForward = customerOpeningBalance.add(beforeInvoices).sub(beforePayments);
  const hasFilter = !!(from || to);
  running = broughtForward;

  // First row: opening balance or brought forward
  const transactions: StatementTransaction[] = [];
  if (hasFilter) {
    transactions.push({
      date: '', type: 'BROUGHT_FORWARD', reference: '', description: 'Balance before the selected date range',
      relatedDocument: '', method: '',
      charge: '0.00', payment: '0.00', balance: broughtForward.toFixed(2), status: '', paymentStatus: '',
    });
  } else {
    transactions.push({
      date: '', type: 'OPENING_BALANCE', reference: '', description: 'Customer opening balance',
      relatedDocument: '', method: '',
      charge: '0.00', payment: '0.00', balance: customerOpeningBalance.toFixed(2), status: '', paymentStatus: '',
    });
  }

  // Compute invoice totals for payment status calculation
  const invoiceTotalMap = new Map<string, Prisma.Decimal>();
  for (const inv of allInvoices) invoiceTotalMap.set(inv.invoiceNumber, inv.totalAmount);

  function paymentStatusLabel(approvedTotal: Prisma.Decimal, invoiceTotal: Prisma.Decimal): string {
    if (approvedTotal.isZero()) return 'Unpaid';
    if (approvedTotal.gte(invoiceTotal)) return 'Fully paid';
    return 'Partially paid';
  }

  let totalInvoiced = new Prisma.Decimal(0);
  let totalPaid = new Prisma.Decimal(0);
  // Track running approved amount per invoice so we can show the payment status
  // after each payment, simulating historical progression.
  const runningApprovedByInvoice = new Map<string, Prisma.Decimal>();

  for (const t of txns) {
    if (t.type === 'INVOICE') {
      running = running.add(t.charge);
      totalInvoiced = totalInvoiced.add(t.charge);
      // Invoice row — show historical state: invoice just issued, nothing paid yet
      transactions.push({
        date: t.date.toISOString(), type: 'INVOICE', reference: t.reference,
        description: `Invoice ${t.reference}`, relatedDocument: t.related,
        method: '', charge: t.charge.toFixed(2), payment: '0.00', balance: running.toFixed(2), status: 'ISSUED', paymentStatus: 'Unpaid',
      });
    } else {
      running = running.sub(t.payment);
      totalPaid = totalPaid.add(t.payment);
      // Payment row — accumulate approved total for this invoice and show resulting status
      const invNumber = t.related; // related is the invoice number for payment rows
      const prevApproved = runningApprovedByInvoice.get(invNumber) ?? new Prisma.Decimal(0);
      const newApproved = prevApproved.add(t.payment);
      runningApprovedByInvoice.set(invNumber, newApproved);
      const invTotal = invoiceTotalMap.get(invNumber) ?? new Prisma.Decimal(0);
      const ps = paymentStatusLabel(newApproved, invTotal);
      const methodLabel: Record<string, string> = { MPESA: 'M-Pesa', CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque' };
      transactions.push({
        date: t.date.toISOString(), type: 'PAYMENT', reference: t.reference,
        description: `Payment ${t.reference}`, relatedDocument: invNumber,
        method: methodLabel[t.method] ?? t.method, charge: '0.00', payment: t.payment.toFixed(2), balance: running.toFixed(2), status: 'APPROVED', paymentStatus: ps,
      });
    }
  }

  return {
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
    openingBalance: broughtForward.toFixed(2),
    totalInvoiced: totalInvoiced.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    closingBalance: running.toFixed(2),
    transactions,
  };
}
