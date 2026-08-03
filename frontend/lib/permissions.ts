/**
 * Interface permission helpers.
 *
 * **These control what is shown, not what is allowed.** Hiding a button is not
 * security. The backend checks every permission again on every request, and it
 * is the only authority.
 *
 * Mirrors docs/permissions-matrix.md.
 */

export const ROLES = ['super_admin', 'admin', 'accountant'] as const;
export type Role = (typeof ROLES)[number];

export const CAPABILITIES = ['CURING_RELEASE', 'SALARY_REGISTER'] as const;
export type Capability = (typeof CAPABILITIES)[number];

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  capabilities?: Capability[];
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Super Admin and Admin. The roles that manage users and approve money. */
export function isAdministrator(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return user?.role === 'super_admin' || user?.role === 'admin';
}

export function isSuperAdmin(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return user?.role === 'super_admin';
}

export function isAccountant(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return user?.role === 'accountant';
}

/** May manage user accounts. */
export function canManageUsers(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return isAdministrator(user);
}

/** May approve or reverse customer payments. Never the Accountant. */
export function canApprovePayments(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return isAdministrator(user);
}

/** May approve or reverse purchase payments (Phase 7D). Never the Accountant. */
export function canApprovePurchasePayments(
  user: Pick<CurrentUser, 'role'> | null | undefined,
): boolean {
  return isAdministrator(user);
}

/** May approve, correct, or reverse salary payments. Never the Accountant. */
export function canApproveSalaries(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return isAdministrator(user);
}

/** May override a customer credit block. */
export function canOverrideCredit(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return isAdministrator(user);
}

/** May set or correct a customer's opening balance. */
export function canSetOpeningBalance(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return isAdministrator(user);
}

/**
 * May set or correct a supplier's opening balance. Every role holds this —
 * unlike the customer equivalent, `supplier:update` is granted to Super
 * Admin, Admin, and Accountant alike (docs/permissions-matrix.md).
 */
export function canSetSupplierOpeningBalance(
  user: Pick<CurrentUser, 'role'> | null | undefined,
): boolean {
  return isRole(user?.role);
}

/**
 * May force-deactivate a customer, bypassing the normal deactivation
 * safeguards (Phase 6E addendum). Never the Accountant.
 */
export function canForceDeactivateCustomer(
  user: Pick<CurrentUser, 'role'> | null | undefined,
): boolean {
  return isAdministrator(user);
}

/**
 * May set opening raw-material or finished stock. Admin/Super Admin only —
 * the Accountant may adjust stock but not set its opening quantity.
 */
export function canSetStockOpening(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return isAdministrator(user);
}

/** May adjust raw-material or finished stock. Every role holds this. */
export function canAdjustStock(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return isRole(user?.role);
}

/** May view audit logs. */
export function canViewAuditLogs(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return isAdministrator(user);
}

/** May change system settings. */
export function canChangeSettings(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return isAdministrator(user);
}

/** May read financial reports. The Accountant sees operational reports only. */
export function canViewFinancialReports(
  user: Pick<CurrentUser, 'role'> | null | undefined,
): boolean {
  return isAdministrator(user);
}

/**
 * Checks an approved per-user capability.
 *
 * Administrators already hold these abilities through their role, so they never
 * need a grant.
 */
export function hasCapability(
  user: CurrentUser | null | undefined,
  capability: Capability,
): boolean {
  if (!user) {
    return false;
  }

  if (isAdministrator(user)) {
    return true;
  }

  return user.capabilities?.includes(capability) ?? false;
}

/** May release cured products. */
export function canReleaseCuring(user: CurrentUser | null | undefined): boolean {
  return hasCapability(user, 'CURING_RELEASE');
}

/** May shorten a curing record's duration. No capability override, unlike release. */
export function canChangeCuringDuration(user: Pick<CurrentUser, 'role'> | null | undefined): boolean {
  return isAdministrator(user);
}

/** May register salary payments. */
export function canRegisterSalary(user: CurrentUser | null | undefined): boolean {
  return hasCapability(user, 'SALARY_REGISTER');
}

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  accountant: 'Accountant',
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}
