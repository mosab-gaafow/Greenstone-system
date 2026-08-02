import type { Employee, Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type { CreateEmployeeInput, ListEmployeesFilters, UpdateEmployeeInput } from './employees.types.js';

/**
 * Employee database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type EmployeeRow = Employee;

function buildWhere(filters: ListEmployeesFilters): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { phone: { contains: filters.search } },
      { jobTitle: { contains: filters.search } },
    ];
  }

  if (filters.salaryFrequency !== undefined) {
    where.salaryFrequency = filters.salaryFrequency;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return where;
}

export async function findEmployees(
  filters: ListEmployeesFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: EmployeeRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.employee.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
    }),
    client.employee.count({ where }),
  ]);

  return { rows, total };
}

export async function findEmployeeById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<EmployeeRow | null> {
  return client.employee.findUnique({ where: { id } });
}

export async function insertEmployee(
  input: CreateEmployeeInput,
  client: DbClient = getPrisma(),
): Promise<EmployeeRow> {
  return client.employee.create({
    data: {
      name: input.name,
      phone: input.phone,
      nationalId: input.nationalId ?? null,
      jobTitle: input.jobTitle,
      salaryFrequency: input.salaryFrequency,
      salaryAmount: input.salaryAmount,
      paymentMethod: input.paymentMethod,
    },
  });
}

export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
  client: DbClient = getPrisma(),
): Promise<EmployeeRow> {
  const data: Prisma.EmployeeUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
  }
  if (input.nationalId !== undefined) {
    data.nationalId = input.nationalId;
  }
  if (input.jobTitle !== undefined) {
    data.jobTitle = input.jobTitle;
  }
  if (input.salaryFrequency !== undefined) {
    data.salaryFrequency = input.salaryFrequency;
  }
  if (input.salaryAmount !== undefined) {
    data.salaryAmount = input.salaryAmount;
  }
  if (input.paymentMethod !== undefined) {
    data.paymentMethod = input.paymentMethod;
  }

  return client.employee.update({ where: { id }, data });
}

export async function setEmployeeActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<EmployeeRow> {
  return client.employee.update({ where: { id }, data: { isActive } });
}
