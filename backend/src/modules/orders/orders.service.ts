import { Prisma, type CreditStatus, type OrderPaymentType } from '../../generated/prisma/client.js';
import {
  findOrderById,
  findOrderBySourceQuotationId,
  findOrders,
  insertOrder,
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
  PermissionDeniedError,
  ResourceNotFoundError,
} from '../../shared/errors/app-error.js';
import * as customersService from '../customers/customers.service.js';
import * as productsService from '../products/products.service.js';
import * as quotationsService from '../quotations/quotations.service.js';
import * as customerCreditService from '../customer-credit/customer-credit.service.js';
import type {
  CreateOrderInput,
  ListOrdersFilters,
  ListOrdersResult,
  OrderDetail,
  OrderItemInput,
  OrderSummary,
} from './orders.types.js';

/**
 * Order business logic. See business-blueprint section 2.6 and
 * docs/implementation-plan.md Phase 5B.
 *
 * An order is created either directly, or by converting one ACCEPTED
 * quotation — never both, and never more than once per quotation
 * (`sourceQuotationId` is unique). The backend calculates every `lineTotal`
 * and `totalAmount` using `Prisma.Decimal`, the same as quotations, even when
 * converting: the source quotation's numbers are trusted as inputs, not
 * copied as already-final totals.
 *
 * Orders have no status lifecycle in this phase — see the `Order` model's
 * doc comment in schema.prisma.
 */

const AUDIT_MODULE = 'orders';
const CACHE_MODULE = 'orders';
const LIST_TTL_SECONDS = 300;

interface ResolvedItem extends OrderItemInput {
  sourceQuotationItemId: string | null;
}

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
  const resolved = await resolveOrderSource(input);
  const address = await requireActiveCustomerAddress(resolved.customerId, input.customerAddressId);
  await assertProductsActive(resolved.items);

  const { items, totalAmount } = computeItems(resolved.items);

  const overridePlan = await resolveCreditOverride(
    resolved.customerId,
    input.paymentType,
    input.creditOverrideReason,
    context.user.role,
  );

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const { documentNumber } = await allocateNumberInTransaction(tx, { documentType: 'ORDER' });

    const order = await insertOrder(
      {
        orderNumber: documentNumber,
        customerId: resolved.customerId,
        customerAddressId: input.customerAddressId,
        addressLabel: address.label,
        addressLine: address.addressLine,
        addressDirections: address.directions,
        sourceQuotationId: resolved.sourceQuotationId,
        paymentType: input.paymentType,
        totalAmount,
        items,
      },
      tx,
    );

    if (overridePlan) {
      await customerCreditService.recordCreditOverride(tx, {
        customerId: resolved.customerId,
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

// --- Helpers ----------------------------------------------------------------

async function requireOrder(id: string): Promise<OrderDetailRow> {
  const order = await findOrderById(id);

  if (!order) {
    throw new ResourceNotFoundError('That order was not found.');
  }

  return order;
}

/**
 * Resolves the order's customer and items from either an accepted quotation
 * or the request's own direct fields. Exactly one of these shapes is valid —
 * enforced first by `createOrderBodySchema`, re-checked here as a safety net.
 */
async function resolveOrderSource(
  input: CreateOrderInput,
): Promise<{ customerId: string; sourceQuotationId: string | null; items: ResolvedItem[] }> {
  if (input.sourceQuotationId !== undefined) {
    const quotation = await quotationsService.getQuotation(input.sourceQuotationId);

    if (quotation.status !== 'ACCEPTED') {
      throw new BusinessRuleViolationError(
        'Only an accepted quotation can be converted to an order.',
      );
    }

    const existingOrder = await findOrderBySourceQuotationId(input.sourceQuotationId);

    if (existingOrder) {
      throw new BusinessRuleViolationError('This quotation has already been converted to an order.');
    }

    return {
      customerId: quotation.customerId,
      sourceQuotationId: quotation.id,
      items: quotation.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        agreedUnitPrice: item.agreedUnitPrice,
        sourceQuotationItemId: item.id,
      })),
    };
  }

  if (!input.customerId || !input.items || input.items.length === 0) {
    throw new BusinessRuleViolationError(
      'Provide a customer and at least one item for a direct order.',
    );
  }

  return {
    customerId: input.customerId,
    sourceQuotationId: null,
    items: input.items.map((item) => ({ ...item, sourceQuotationItemId: null })),
  };
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

async function assertProductsActive(items: ResolvedItem[]): Promise<void> {
  const uniqueProductIds = [...new Set(items.map((item) => item.productId))];

  for (const productId of uniqueProductIds) {
    const product = await productsService.getProduct(productId);

    if (!product.isActive) {
      throw new BusinessRuleViolationError(`"${product.name}" is inactive and cannot be ordered.`);
    }
  }
}

/**
 * Checks the customer's current credit status for a CREDIT order and decides
 * whether an override is needed. Reads current status only — not a
 * hypothetical status including this new order's own amount — per
 * business-blueprint section 2.24.
 */
async function resolveCreditOverride(
  customerId: string,
  paymentType: OrderPaymentType,
  creditOverrideReason: string | undefined,
  role: GreenstoneRole,
): Promise<OverridePlan | null> {
  if (paymentType !== 'CREDIT') {
    return null;
  }

  const status = await customerCreditService.getCreditStatus(customerId);

  if (status.creditStatus !== 'BLOCKED') {
    return null;
  }

  if (!creditOverrideReason) {
    throw new CustomerCreditBlockedError();
  }

  const allowed = await hasPermission(role, 'customer-credit', 'override');

  if (!allowed) {
    throw new PermissionDeniedError();
  }

  return { previousCreditStatus: status.creditStatus, reason: creditOverrideReason };
}

/**
 * Computes every line total and the order total in decimal, never JavaScript
 * floating-point arithmetic. Callers already confirmed every product exists
 * and is active before this runs.
 */
function computeItems(items: ResolvedItem[]): {
  items: (ResolvedItem & { lineTotal: Prisma.Decimal })[];
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
    `pt=${filters.paymentType ?? ''}`,
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
    sourceQuotationId: row.sourceQuotationId,
    paymentType: row.paymentType,
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
    sourceQuotationId: row.sourceQuotationId,
    paymentType: row.paymentType,
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
  sourceQuotationId: string | null;
  paymentType: OrderPaymentType;
  totalAmount: Prisma.Decimal;
}): Record<string, unknown> {
  return {
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    customerAddressId: row.customerAddressId,
    sourceQuotationId: row.sourceQuotationId,
    paymentType: row.paymentType,
    totalAmount: row.totalAmount.toFixed(2),
  };
}
