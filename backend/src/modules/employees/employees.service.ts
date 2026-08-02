import type { EmployeeRow } from './employees.repository.js';
import {
  findEmployeeById,
  findEmployees,
  insertEmployee,
  setEmployeeActive,
  updateEmployee,
} from './employees.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import type {
  CreateEmployeeInput,
  EmployeeSummary,
  ListEmployeesFilters,
  ListEmployeesResult,
  UpdateEmployeeInput,
} from './employees.types.js';

/**
 * Employee business logic.
 *
 * Employees are never deleted, only activated and deactivated — a payroll
 * history will reference them permanently once salary payments exist.
 */

const AUDIT_MODULE = 'employees';
const CACHE_MODULE = 'employees';
const LIST_TTL_SECONDS = 300;

export async function listEmployees(filters: ListEmployeesFilters): Promise<ListEmployeesResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findEmployees(filters);
    return { employees: rows.map(toSummary), totalRecords: total };
  });
}

export async function getEmployee(id: string): Promise<EmployeeSummary> {
  return toSummary(await requireEmployee(id));
}

export async function createEmployee(
  input: CreateEmployeeInput,
  context: RequestContext,
): Promise<EmployeeSummary> {
  const created = await runInTransaction(async (tx: TransactionClient) => {
    const employee = await insertEmployee(input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_EMPLOYEE',
      module: AUDIT_MODULE,
      entityType: 'Employee',
      entityId: employee.id,
      updatedData: toAuditSnapshot(employee),
    });

    return employee;
  });

  await invalidateEmployeeCache();

  return toSummary(created);
}

export async function editEmployee(
  id: string,
  input: UpdateEmployeeInput,
  context: RequestContext,
): Promise<EmployeeSummary> {
  const existing = await requireEmployee(id);

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const employee = await updateEmployee(id, input, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'UPDATE_EMPLOYEE',
      module: AUDIT_MODULE,
      entityType: 'Employee',
      entityId: id,
      previousData: toAuditSnapshot(existing),
      updatedData: toAuditSnapshot(employee),
    });

    return employee;
  });

  await invalidateEmployeeCache();

  return toSummary(updated);
}

export async function activateEmployee(
  id: string,
  context: RequestContext,
): Promise<EmployeeSummary> {
  return changeActiveState(id, true, context);
}

export async function deactivateEmployee(
  id: string,
  context: RequestContext,
): Promise<EmployeeSummary> {
  return changeActiveState(id, false, context);
}

async function changeActiveState(
  id: string,
  isActive: boolean,
  context: RequestContext,
): Promise<EmployeeSummary> {
  const existing = await requireEmployee(id);

  if (existing.isActive === isActive) {
    throw new BusinessRuleViolationError(
      isActive ? 'This employee is already active.' : 'This employee is already inactive.',
    );
  }

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const employee = await setEmployeeActive(id, isActive, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: isActive ? 'ACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE',
      module: AUDIT_MODULE,
      entityType: 'Employee',
      entityId: id,
      previousData: { isActive: existing.isActive },
      updatedData: { isActive },
    });

    return employee;
  });

  await invalidateEmployeeCache();

  return toSummary(updated);
}

async function requireEmployee(id: string): Promise<EmployeeRow> {
  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new ResourceNotFoundError('That employee was not found.');
  }

  return employee;
}

async function invalidateEmployeeCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListEmployeesFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `f=${filters.salaryFrequency ?? ''}`,
    `a=${filters.isActive === undefined ? '' : String(filters.isActive)}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: EmployeeRow): EmployeeSummary {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    nationalId: row.nationalId,
    jobTitle: row.jobTitle,
    salaryFrequency: row.salaryFrequency,
    salaryAmount: row.salaryAmount.toFixed(2),
    paymentMethod: row.paymentMethod,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: EmployeeRow): Record<string, unknown> {
  return {
    name: row.name,
    phone: row.phone,
    nationalId: row.nationalId,
    jobTitle: row.jobTitle,
    salaryFrequency: row.salaryFrequency,
    salaryAmount: row.salaryAmount.toFixed(2),
    paymentMethod: row.paymentMethod,
    isActive: row.isActive,
  };
}
