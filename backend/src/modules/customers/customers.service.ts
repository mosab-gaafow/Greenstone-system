import {
  findAddressByLabel,
  findAddressById,
  findCustomerByEmail,
  findCustomerByPhone,
  findCustomerById,
  findCustomers,
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
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import {
  BusinessRuleViolationError,
  ResourceNotFoundError,
} from '../../shared/errors/app-error.js';
import type {
  CreateAddressInput,
  CreateCustomerInput,
  CustomerAddressSummary,
  CustomerDetail,
  CustomerSummary,
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

export async function deactivateCustomer(
  id: string,
  context: RequestContext,
): Promise<CustomerDetail> {
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
    await setCustomerActive(id, isActive, tx);

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

async function invalidateCustomerCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListCustomersFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `a=${filters.isActive === undefined ? '' : String(filters.isActive)}`,
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
