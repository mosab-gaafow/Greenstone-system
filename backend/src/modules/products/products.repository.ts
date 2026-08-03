import type { Prisma, Product } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import { normalizeForComparison } from '../../shared/utils/normalize.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type {
  CreateProductInput,
  ListProductsFilters,
  UpdateProductInput,
} from './products.types.js';

/**
 * Product database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type ProductRow = Product;

function buildWhere(filters: ListProductsFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (filters.search) {
    where.OR = [{ name: { contains: filters.search } }, { size: { contains: filters.search } }];
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return where;
}

export async function findProducts(
  filters: ListProductsFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: ProductRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.product.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
    }),
    client.product.count({ where }),
  ]);

  return { rows, total };
}

export async function findProductById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<ProductRow | null> {
  return client.product.findUnique({ where: { id } });
}

/**
 * Finds a product by its normalised name.
 *
 * Comparing on `nameNormalized` rather than `name` is what makes the check
 * catch "Hollow Blocks 6 x 9" against "Hollow Blocks 6 × 9" and against
 * "hollow  blocks 6 x 9".
 */
export async function findProductByName(
  name: string,
  client: DbClient = getPrisma(),
): Promise<ProductRow | null> {
  return client.product.findUnique({
    where: { nameNormalized: normalizeForComparison(name) },
  });
}

/**
 * Finds a product by its normalised operational name.
 *
 * Mirrors `findProductByName` — comparing on the normalised column is what
 * catches "4-Inch" against "4-inch" and against " 4-inch ".
 */
export async function findProductByOperationalName(
  operationalName: string,
  client: DbClient = getPrisma(),
): Promise<ProductRow | null> {
  return client.product.findUnique({
    where: { operationalNameNormalized: normalizeForComparison(operationalName) },
  });
}

export async function insertProduct(
  input: CreateProductInput,
  client: DbClient = getPrisma(),
): Promise<ProductRow> {
  return client.product.create({
    data: {
      name: input.name,
      nameNormalized: normalizeForComparison(input.name),
      category: input.category,
      size: input.size,
      description: input.description ?? null,
      operationalName: input.operationalName ?? null,
      operationalNameNormalized:
        input.operationalName != null ? normalizeForComparison(input.operationalName) : null,
      piecesPerPallet: input.piecesPerPallet ?? null,
      maxPiecesPerTruck: input.maxPiecesPerTruck ?? null,
    },
  });
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  client: DbClient = getPrisma(),
): Promise<ProductRow> {
  const data: Prisma.ProductUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
    // Kept in step with `name`, otherwise the unique index would guard a stale
    // value and duplicates could slip back in.
    data.nameNormalized = normalizeForComparison(input.name);
  }
  if (input.category !== undefined) {
    data.category = input.category;
  }
  if (input.size !== undefined) {
    data.size = input.size;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.operationalName !== undefined) {
    data.operationalName = input.operationalName;
    data.operationalNameNormalized =
      input.operationalName != null ? normalizeForComparison(input.operationalName) : null;
  }
  if (input.piecesPerPallet !== undefined) {
    data.piecesPerPallet = input.piecesPerPallet;
  }
  if (input.maxPiecesPerTruck !== undefined) {
    data.maxPiecesPerTruck = input.maxPiecesPerTruck;
  }

  return client.product.update({ where: { id }, data });
}

export async function setProductActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<ProductRow> {
  return client.product.update({ where: { id }, data: { isActive } });
}

export async function countProducts(client: DbClient = getPrisma()): Promise<number> {
  return client.product.count();
}
