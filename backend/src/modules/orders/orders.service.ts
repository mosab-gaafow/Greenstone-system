import {
  Prisma,
  type CreditStatus,
  type OrderPaymentArrangement,
  type OrderStatus,
} from '../../generated/prisma/client.js';
import {
  findOrderById,
  findOrders,
  incrementOrderItemAllocatedQuantity,
  incrementOrderItemDeliveredQuantity,
  incrementOrderItemProducedQuantity,
  insertOrder,
  isOrderFullyDelivered,
  setOrderCancelled,
  updateOrderStatus,
  type OrderDetailRow,
  type OrderRow,
} from './orders.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { hasPermission } from '../../shared/auth/permission.middleware.js';
import type { GreenstoneRole } from '../../shared/auth/permissions.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import {
  BusinessRuleViolationError,
  CustomerCreditBlockedError,
  InvalidDocumentStatusError,
  PermissionDeniedError,
  ResourceNotFoundError,
} from '../../shared/errors/app-error.js';
import * as customersService from '../customers/customers.service.js';
import * as productsService from '../products/products.service.js';
import * as customerCreditService from '../customer-credit/customer-credit.service.js';
import type {
  CancelOrderInput,
  CreateOrderInput,
  ListOrdersFilters,
  ListOrdersResult,
  OrderDetail,
  OrderItemInput,
  OrderSummary,
} from './orders.types.js';

/**
 * Order business logic. See business-blueprint section 2.6,
 * docs/implementation-plan.md Phase 5B/6C-2, and
 * docs/decisions/business-workflow-update-2026-08-02.md.
 *
 * Direct creation only — quotation conversion was removed in Phase 6C-2
 * (2026-08-02). The backend calculates every `lineTotal` and `totalAmount`
 * using `Prisma.Decimal`, never trusted from a request.
 *
 * `status` is system-controlled: every order starts `PENDING` and moves only
 * through explicit service actions — `cancelOrder` here, and later
 * Production/Curing/Delivery modules for the remaining statuses. There is no
 * generic status-update endpoint.
 */

const AUDIT_MODULE = 'orders';
const CACHE_MODULE = 'orders';
const LIST_TTL_SECONDS = 300;

/** Statuses an order may still be cancelled from. Terminal statuses cannot. */
const CANCELLABLE_STATUSES: OrderStatus[] = [
  'PENDING',
  'IN_PRODUCTION',
  'CURING',
  'READY_FOR_DELIVERY',
  'PARTIALLY_DELIVERED',
];

interface OverridePlan {
  previousCreditStatus: CreditStatus;
  reason: string;
}

export async function listOrders(filters: ListOrdersFilters): Promise<ListOrdersResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findOrders(filters);
    return { orders: rows.map(toSummary), totalRecords: total };
  });
}

export async function getOrder(id: string): Promise<OrderDetail> {
  return toDetail(await requireOrder(id));
}

export async function createOrder(
  input: CreateOrderInput,
  context: RequestContext,
): Promise<OrderDetail> {
  const address = await requireActiveCustomerAddress(input.customerId, input.customerAddressId);
  await assertProductsActive(input.items);

  const { items, totalAmount } = computeItems(input.items);

  const overridePlan = await resolveCreditOverride(
    input.customerId,
    input.paymentArrangement,
    totalAmount,
    input.creditOverrideReason,
    context.user.role,
  );

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const { documentNumber } = await allocateNumberInTransaction(tx, { documentType: 'ORDER' });

    const order = await insertOrder(
      {
        orderNumber: documentNumber,
        customerId: input.customerId,
        customerAddressId: input.customerAddressId,
        addressLabel: address.label,
        addressLine: address.addressLine,
        addressDirections: address.directions,
        paymentArrangement: input.paymentArrangement,
        totalAmount,
        items,
      },
      tx,
    );

    if (overridePlan) {
      await customerCreditService.recordCreditOverride(tx, {
        customerId: input.customerId,
        relatedOrderId: order.id,
        previousCreditStatus: overridePlan.previousCreditStatus,
        reason: overridePlan.reason,
        approvedByUserId: context.user.id,
      });

      await recordAudit(tx, {
        ...toAuditContext(context),
        action: 'OVERRIDE_CUSTOMER_CREDIT',
        module: 'customer-credit',
        entityType: 'CustomerCreditOverride',
        entityId: order.id,
        reason: overridePlan.reason,
        updatedData: {
          previousCreditStatus: overridePlan.previousCreditStatus,
          relatedOrderId: order.id,
        },
      });
    }

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_ORDER',
      module: AUDIT_MODULE,
      entityType: 'Order',
      entityId: order.id,
      documentNumber,
      updatedData: toAuditSnapshot(order),
    });

    return order;
  });

  await invalidateOrderCache();

  return toDetail(created);
}

/**
 * Explicit cancellation action — the only status action this phase allows a
 * user to trigger directly. Requires a written reason and writes an audit
 * log, matching the pattern already used for Quotation status changes
 * (Phase 5A) and Curing duration changes (Phase 6B). There is no generic
 * status-update endpoint — the remaining statuses are set only by
 * Production, Curing, and Delivery as those phases ship.
 */
export async function cancelOrder(
  id: string,
  input: CancelOrderInput,
  context: RequestContext,
): Promise<OrderDetail> {
  const existing = await requireOrder(id);
  assertCancellable(existing.status);

  const reason = input.reason.trim();

  await runInTransaction(async (tx: TransactionClient) => {
    await setOrderCancelled(id, reason, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CANCEL_ORDER',
      module: AUDIT_MODULE,
      entityType: 'Order',
      entityId: id,
      documentNumber: existing.orderNumber,
      reason,
      previousData: { status: existing.status },
      updatedData: { status: 'CANCELLED', statusReason: reason },
    });
  });

  await invalidateOrderCache();

  return getOrder(id);
}

/**
 * Credits an order item's produced quantity inside the caller's existing
 * transaction. Used by `production.service.ts` when a production batch
 * allocates quantity to this item — the same "accept a caller-supplied `tx`"
 * pattern used throughout this codebase for cross-module writes.
 */
export async function incrementProducedQuantity(
  tx: TransactionClient,
  orderItemId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  await incrementOrderItemProducedQuantity(tx, orderItemId, quantity);
}

/**
 * Credits an order item's allocated quantity inside the caller's existing
 * transaction. Used by `curing.service.ts` when curing releases quantity
 * earmarked for this item — "available for the order" (business-blueprint
 * section 2.8).
 */
export async function incrementAllocatedQuantity(
  tx: TransactionClient,
  orderItemId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  await incrementOrderItemAllocatedQuantity(tx, orderItemId, quantity);
}

// --- Helpers ----------------------------------------------------------------

async function requireOrder(id: string): Promise<OrderDetailRow> {
  const order = await findOrderById(id);

  if (!order) {
    throw new ResourceNotFoundError('That order was not found.');
  }

  return order;
}

function assertCancellable(status: OrderStatus): void {
  if (!CANCELLABLE_STATUSES.includes(status)) {
    throw new InvalidDocumentStatusError(
      `An order with status ${status} cannot be cancelled.`,
    );
  }
}

async function requireActiveCustomerAddress(
  customerId: string,
  customerAddressId: string,
): Promise<{ label: string; addressLine: string; directions: string | null }> {
  const customer = await customersService.getCustomer(customerId);

  if (!customer.isActive) {
    throw new BusinessRuleViolationError('This customer is inactive and cannot be ordered for.');
  }

  const address = customer.addresses.find((candidate) => candidate.id === customerAddressId);

  if (!address) {
    throw new ResourceNotFoundError('That address was not found for this customer.');
  }

  if (!address.isActive) {
    throw new BusinessRuleViolationError('This address is inactive and cannot be used for a new order.');
  }

  return address;
}

async function assertProductsActive(items: OrderItemInput[]): Promise<void> {
  const uniqueProductIds = [...new Set(items.map((item) => item.productId))];

  for (const productId of uniqueProductIds) {
    const product = await productsService.getProduct(productId);

    if (!product.isActive) {
      throw new BusinessRuleViolationError(`"${product.name}" is inactive and cannot be ordered.`);
    }
  }
}

/**
 * Checks the customer's projected credit exposure for a CREDIT order and
 * decides whether an override is needed. Explicitly includes this new
 * order's own total in the projection (Phase 6E) — per
 * docs/decisions/business-workflow-update-2026-08-02.md section 6, a real
 * behaviour change from the superseded Phase 5B check, which read only the
 * customer's current status.
 */
async function resolveCreditOverride(
  customerId: string,
  paymentArrangement: OrderPaymentArrangement,
  totalAmount: Prisma.Decimal,
  creditOverrideReason: string | undefined,
  role: GreenstoneRole,
): Promise<OverridePlan | null> {
  if (paymentArrangement !== 'CREDIT') {
    return null;
  }

  const projection = await customerCreditService.getCreditProjection(
    customerId,
    totalAmount.toFixed(2),
  );

  if (projection.creditStatus !== 'BLOCKED') {
    return null;
  }

  if (!creditOverrideReason) {
    throw new CustomerCreditBlockedError();
  }

  const allowed = await hasPermission(role, 'customer-credit', 'override');

  if (!allowed) {
    throw new PermissionDeniedError();
  }

  return { previousCreditStatus: projection.creditStatus, reason: creditOverrideReason };
}

/**
 * Computes every line total and the order total in decimal, never JavaScript
 * floating-point arithmetic. Callers already confirmed every product exists
 * and is active before this runs.
 */
function computeItems(items: OrderItemInput[]): {
  items: (OrderItemInput & { lineTotal: Prisma.Decimal })[];
  totalAmount: Prisma.Decimal;
} {
  let totalAmount = new Prisma.Decimal(0);

  const computed = items.map((item) => {
    const lineTotal = new Prisma.Decimal(item.agreedUnitPrice).mul(item.quantity);
    totalAmount = totalAmount.add(lineTotal);
    return { ...item, lineTotal };
  });

  return { items: computed, totalAmount };
}

async function invalidateOrderCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListOrdersFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `c=${filters.customerId ?? ''}`,
    `pa=${filters.paymentArrangement ?? ''}`,
    `st=${filters.status ?? ''}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: OrderRow): OrderSummary {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    customerName: row.customer.name,
    customerAddressId: row.customerAddressId,
    addressLabel: row.addressLabel,
    paymentArrangement: row.paymentArrangement,
    status: row.status,
    statusReason: row.statusReason,
    totalAmount: row.totalAmount.toFixed(2),
    itemCount: row._count.items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: OrderDetailRow): OrderDetail {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    customerName: row.customer.name,
    customerAddressId: row.customerAddressId,
    addressLabel: row.addressLabel,
    addressLine: row.addressLine,
    addressDirections: row.addressDirections,
    paymentArrangement: row.paymentArrangement,
    status: row.status,
    statusReason: row.statusReason,
    totalAmount: row.totalAmount.toFixed(2),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      agreedUnitPrice: item.agreedUnitPrice.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
      producedQuantity: item.producedQuantity,
      allocatedQuantity: item.allocatedQuantity,
      deliveredQuantity: item.deliveredQuantity,
      remainingQuantity: item.remainingQuantity,
    })),
  };
}

function toAuditSnapshot(row: {
  orderNumber: string;
  customerId: string;
  customerAddressId: string;
  paymentArrangement: OrderPaymentArrangement;
  status: OrderStatus;
  totalAmount: Prisma.Decimal;
}): Record<string, unknown> {
  return {
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    customerAddressId: row.customerAddressId,
    paymentArrangement: row.paymentArrangement,
    status: row.status,
    totalAmount: row.totalAmount.toFixed(2),
  };
}

// --- Phase 8D: Delivery completion helpers ---------------------------------

/** Credits deliveredQuantity and recalculates remainingQuantity. */
export async function incrementDeliveredQuantity(
  tx: TransactionClient,
  orderItemId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) return;
  await incrementOrderItemDeliveredQuantity(tx, orderItemId, quantity);
}

/** Recalculates the Order status after delivery. COMPLETED when every item has remainingQuantity = 0; otherwise PARTIALLY_DELIVERED. */
export async function recalculateOrderStatus(
  tx: TransactionClient,
  orderId: string,
): Promise<void> {
  const fullyDelivered = await isOrderFullyDelivered(tx, orderId);
  await updateOrderStatus(tx, orderId, fullyDelivered ? 'COMPLETED' : 'PARTIALLY_DELIVERED');
}
