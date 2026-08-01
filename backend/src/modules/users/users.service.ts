import type { Capability } from '../../generated/prisma/client.js';
import { auth } from '../../shared/auth/auth.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import {
  grantCapability,
  listCapabilities,
  revokeCapability,
} from '../../shared/auth/capability.service.js';
import { isGreenstoneRole, type GreenstoneRole } from '../../shared/auth/permissions.js';
import { recordAuditStandalone } from '../../shared/audit/audit.service.js';
import {
  BusinessRuleViolationError,
  ResourceNotFoundError,
} from '../../shared/errors/app-error.js';
import {
  findCapabilitiesForUsers,
  findUserByEmail,
  findUserById,
  findUsers,
  type UserRow,
} from './users.repository.js';
import type {
  CapabilityInput,
  CreateUserInput,
  ListUsersFilters,
  ListUsersResult,
  SetUserActiveInput,
  UpdateUserRoleInput,
  UserSummary,
} from './users.types.js';

/**
 * User management business logic.
 *
 * Better Auth owns the user records, so writes go through its server APIs.
 * Greenstone owns the business rules and the audit trail around them.
 *
 * Better Auth performs its writes through its own adapter, so a user write and
 * its audit row cannot share one database transaction. The audit row is written
 * immediately after a successful call; a failure there is surfaced, not
 * swallowed.
 */

const AUDIT_MODULE = 'users';

export async function listUsers(filters: ListUsersFilters): Promise<ListUsersResult> {
  const { rows, total } = await findUsers({
    skip: (filters.page - 1) * filters.pageSize,
    take: filters.pageSize,
    search: filters.search,
  });

  const capabilities = await findCapabilitiesForUsers(rows.map((row) => row.id));

  return {
    users: rows.map((row) => toSummary(row, capabilities.get(row.id) ?? [])),
    totalRecords: total,
  };
}

export async function getUser(userId: string): Promise<UserSummary> {
  const row = await requireUser(userId);
  return toSummary(row, await listCapabilities(userId));
}

/**
 * Creates a user.
 *
 * Public sign-up is disabled, so this is the only route into the system. Better
 * Auth checks that the caller may create users and hashes the password.
 */
export async function createUser(
  input: CreateUserInput,
  context: RequestContext,
): Promise<UserSummary> {
  if (await findUserByEmail(input.email)) {
    throw new BusinessRuleViolationError('A user with this email already exists.');
  }

  const created = await auth.api.createUser({
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
    },
    headers: context.headers,
  });

  await recordAuditStandalone({
    ...toAuditContext(context),
    action: 'CREATE_USER',
    module: AUDIT_MODULE,
    entityType: 'User',
    entityId: created.user.id,
    // The password is never included here, or anywhere else.
    updatedData: { name: input.name, email: input.email, role: input.role },
  });

  return getUser(created.user.id);
}

/**
 * Changes a user's role.
 *
 * All of the user's sessions are revoked afterwards, so a reduced set of
 * permissions cannot keep working until the old session expires.
 */
export async function updateUserRole(
  input: UpdateUserRoleInput,
  context: RequestContext,
): Promise<UserSummary> {
  const existing = await requireUser(input.userId);

  if (existing.role === input.role) {
    throw new BusinessRuleViolationError('The user already has this role.');
  }

  assertNotSelf(input.userId, context, 'You cannot change your own role.');

  await auth.api.setRole({
    body: { userId: input.userId, role: input.role },
    headers: context.headers,
  });

  await auth.api.revokeUserSessions({
    body: { userId: input.userId },
    headers: context.headers,
  });

  await recordAuditStandalone({
    ...toAuditContext(context),
    action: 'CHANGE_USER_ROLE',
    module: AUDIT_MODULE,
    entityType: 'User',
    entityId: input.userId,
    previousData: { role: existing.role },
    updatedData: { role: input.role },
  });

  return getUser(input.userId);
}

/**
 * Deactivates a user.
 *
 * Deactivation maps to the Better Auth ban, which blocks sign-in and revokes
 * every active session at once.
 */
export async function deactivateUser(
  input: SetUserActiveInput,
  context: RequestContext,
): Promise<UserSummary> {
  const existing = await requireUser(input.userId);

  if (existing.banned === true) {
    throw new BusinessRuleViolationError('This user is already deactivated.');
  }

  assertNotSelf(input.userId, context, 'You cannot deactivate your own account.');

  await auth.api.banUser({
    body: { userId: input.userId, banReason: input.reason ?? 'Deactivated by an administrator.' },
    headers: context.headers,
  });

  await recordAuditStandalone({
    ...toAuditContext(context),
    action: 'DEACTIVATE_USER',
    module: AUDIT_MODULE,
    entityType: 'User',
    entityId: input.userId,
    reason: input.reason ?? null,
    previousData: { isActive: true },
    updatedData: { isActive: false },
  });

  return getUser(input.userId);
}

export async function activateUser(
  input: SetUserActiveInput,
  context: RequestContext,
): Promise<UserSummary> {
  const existing = await requireUser(input.userId);

  if (existing.banned !== true) {
    throw new BusinessRuleViolationError('This user is already active.');
  }

  await auth.api.unbanUser({
    body: { userId: input.userId },
    headers: context.headers,
  });

  await recordAuditStandalone({
    ...toAuditContext(context),
    action: 'ACTIVATE_USER',
    module: AUDIT_MODULE,
    entityType: 'User',
    entityId: input.userId,
    reason: input.reason ?? null,
    previousData: { isActive: false },
    updatedData: { isActive: true },
  });

  return getUser(input.userId);
}

/** Signs a user out of every device. */
export async function revokeUserSessions(userId: string, context: RequestContext): Promise<void> {
  await requireUser(userId);

  await auth.api.revokeUserSessions({
    body: { userId },
    headers: context.headers,
  });

  await recordAuditStandalone({
    ...toAuditContext(context),
    action: 'REVOKE_USER_SESSIONS',
    module: AUDIT_MODULE,
    entityType: 'User',
    entityId: userId,
  });
}

export async function grantUserCapability(
  input: CapabilityInput,
  context: RequestContext,
): Promise<UserSummary> {
  await requireUser(input.userId);
  await grantCapability(input.userId, input.capability, toAuditContext(context));
  return getUser(input.userId);
}

export async function revokeUserCapability(
  input: CapabilityInput,
  context: RequestContext,
): Promise<UserSummary> {
  await requireUser(input.userId);
  await revokeCapability(input.userId, input.capability, toAuditContext(context));
  return getUser(input.userId);
}

async function requireUser(userId: string): Promise<UserRow> {
  const row = await findUserById(userId);

  if (!row) {
    throw new ResourceNotFoundError('That user was not found.');
  }

  return row;
}

/**
 * Blocks actions an administrator should not perform on their own account.
 * Without this, an admin could lock themselves out or quietly demote
 * themselves mid-session.
 */
function assertNotSelf(userId: string, context: RequestContext, message: string): void {
  if (userId === context.user.id) {
    throw new BusinessRuleViolationError(message);
  }
}

function toSummary(row: UserRow, capabilities: Capability[]): UserSummary {
  const role: GreenstoneRole = isGreenstoneRole(row.role) ? row.role : 'accountant';

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role,
    isActive: row.banned !== true,
    createdAt: row.createdAt.toISOString(),
    capabilities,
  };
}
