import type { ProductRow } from './products.repository.js';
import {
  findProductById,
  findProductByName,
  findProducts,
  insertProduct,
  setProductActive,
  updateProduct,
} from './products.repository.js';
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
  CreateProductInput,
  ListProductsFilters,
  ListProductsResult,
  ProductSummary,
  UpdateProductInput,
} from './products.types.js';

/**
 * Product business logic.
 *
 * Products carry no price. Prices are agreed per transaction and snapshotted on
 * order and invoice items.
 *
 * Product lists are read-heavy and change rarely, so they are cached. The cache
 * is a convenience only: every write invalidates it **after** the transaction
 * commits, and a cache failure never fails a request.
 */

const AUDIT_MODULE = 'products';
const CACHE_MODULE = 'products';
/** Master data changes rarely, so it can be held a little longer. */
const LIST_TTL_SECONDS = 300;

export async function listProducts(filters: ListProductsFilters): Promise<ListProductsResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findProducts(filters);
    return { products: rows.map(toSummary), totalRecords: total };
  });
}

export async function getProduct(id: string): Promise<ProductSummary> {
  return toSummary(await requireProduct(id));
}

export async function createProduct(
  input: CreateProductInput,
  context: RequestContext,
): Promise<ProductSummary> {
  await assertNameAvailable(input.name);

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const product = await insertProduct(input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_PRODUCT',
      module: AUDIT_MODULE,
      entityType: 'Product',
      entityId: product.id,
      updatedData: toAuditSnapshot(product),
    });

    return product;
  });

  await invalidateProductCache();

  return toSummary(created);
}

export async function editProduct(
  id: string,
  input: UpdateProductInput,
  context: RequestContext,
): Promise<ProductSummary> {
  const existing = await requireProduct(id);

  if (input.name !== undefined && input.name !== existing.name) {
    await assertNameAvailable(input.name);
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const product = await updateProduct(id, input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_PRODUCT',
      module: AUDIT_MODULE,
      entityType: 'Product',
      entityId: id,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(product),
    });

    return product;
  });

  await invalidateProductCache();

  return toSummary(updated);
}

export async function activateProduct(
  id: string,
  context: RequestContext,
): Promise<ProductSummary> {
  return changeActiveState(id, true, context);
}

export async function deactivateProduct(
  id: string,
  context: RequestContext,
): Promise<ProductSummary> {
  return changeActiveState(id, false, context);
}

/**
 * Products are never deleted, only activated and deactivated, because past
 * orders and invoices reference them permanently.
 */
async function changeActiveState(
  id: string,
  isActive: boolean,
  context: RequestContext,
): Promise<ProductSummary> {
  const existing = await requireProduct(id);

  if (existing.isActive === isActive) {
    throw new BusinessRuleViolationError(
      isActive ? 'This product is already active.' : 'This product is already inactive.',
    );
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const product = await setProductActive(id, isActive, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: isActive ? 'ACTIVATE_PRODUCT' : 'DEACTIVATE_PRODUCT',
      module: AUDIT_MODULE,
      entityType: 'Product',
      entityId: id,
      previousData: { isActive: existing.isActive },
      updatedData: { isActive },
    });

    return product;
  });

  await invalidateProductCache();

  return toSummary(updated);
}

async function requireProduct(id: string): Promise<ProductRow> {
  const product = await findProductById(id);

  if (!product) {
    throw new ResourceNotFoundError('That product was not found.');
  }

  return product;
}

/**
 * Rejects a duplicate name before the database does.
 *
 * The unique index is the real guarantee; this exists so the user gets a clear
 * message instead of a constraint error.
 */
async function assertNameAvailable(name: string): Promise<void> {
  if (await findProductByName(name)) {
    throw new BusinessRuleViolationError('A product with this name already exists.');
  }
}

/**
 * Invalidates every cached product entry.
 *
 * Called after the transaction commits, never before — a failed write must not
 * clear a cache that still matches the database.
 */
async function invalidateProductCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

/** Stable identifier for a list query, so the same filters hit the same key. */
function buildListIdentifier(filters: ListProductsFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `c=${filters.category ?? ''}`,
    `a=${filters.isActive === undefined ? '' : String(filters.isActive)}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: ProductRow): ProductSummary {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    size: row.size,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: ProductRow): Record<string, unknown> {
  return {
    name: row.name,
    category: row.category,
    size: row.size,
    description: row.description,
    isActive: row.isActive,
  };
}
