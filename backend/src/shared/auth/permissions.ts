import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';

/**
 * Greenstone roles and permissions.
 *
 * Every entry here is derived from docs/permissions-matrix.md, which in turn
 * comes from docs/business-blueprint.md section 5. Do not add a resource or
 * action that is not approved there.
 *
 * Better Auth permissions control system access. Greenstone services still
 * validate business state such as stock, credit, payments, salaries, and status
 * transitions.
 */

/**
 * Resources and the actions each supports.
 *
 * `defaultStatements` contributes Better Auth's own `user` and `session`
 * resources, which the Admin plugin needs in order to manage accounts.
 *
 * Resources whose modules do not exist yet are declared now because the
 * permission map is defined once, in one place. They take effect when their
 * module ships.
 */
export const statement = {
  ...defaultStatements,

  // System
  capability: ['grant', 'revoke', 'read'],
  settings: ['read', 'update'],
  'audit-log': ['read'],

  // Master data
  customer: ['create', 'read', 'update'],
  'customer-address': ['create', 'read', 'update'],
  product: ['create', 'read', 'update'],
  'measurement-unit': ['create', 'read', 'update'],
  'raw-material': ['create', 'read', 'update'],
  supplier: ['create', 'read', 'update'],
  employee: ['create', 'read', 'update'],
  driver: ['create', 'read', 'update'],
  vehicle: ['create', 'read', 'update'],

  // Sales and credit
  order: ['create', 'read', 'update', 'cancel'],
  'customer-credit': ['read', 'set-opening-balance', 'override'],

  // Production and stock
  production: ['create', 'read', 'allocate'],
  curing: ['create', 'read', 'change-duration', 'release'],
  'finished-stock': ['read', 'set-opening', 'adjust'],
  'broken-product': ['create', 'read'],
  'raw-material-stock': ['read', 'set-opening', 'adjust'],

  // Purchasing and delivery
  purchase: ['create', 'read'],
  'purchase-payment': ['create', 'read', 'approve', 'reverse'],
  delivery: ['create', 'read', 'dispatch', 'cancel', 'correct'],

  // Finance
  invoice: ['create', 'read', 'void'],
  'customer-payment': ['create', 'read', 'approve', 'reverse'],
  receipt: ['read', 'print'],
  expense: ['create', 'read'],
  salary: ['register', 'read', 'approve', 'correct', 'reverse'],

  // Reporting
  dashboard: ['read'],
  report: ['read-operational', 'read-financial'],
  notification: ['read'],
} as const;

export const ac = createAccessControl(statement);

/**
 * Accountant.
 *
 * Cannot approve or reverse payments, cannot approve, correct or reverse
 * salaries, cannot override customer credit, cannot manage users, and cannot
 * view audit logs.
 *
 * Curing release and salary registration are granted per user through the
 * Greenstone capability system, not through this role.
 */
export const accountant = ac.newRole({
  customer: ['create', 'read', 'update'],
  'customer-address': ['create', 'read', 'update'],
  product: ['read'],
  'measurement-unit': ['read'],
  'raw-material': ['create', 'read', 'update'],
  supplier: ['create', 'read', 'update'],
  employee: ['read'],
  driver: ['create', 'read', 'update'],
  vehicle: ['create', 'read', 'update'],

  order: ['create', 'read', 'update', 'cancel'],
  'customer-credit': ['read'],

  production: ['create', 'read', 'allocate'],
  curing: ['create', 'read'],
  'finished-stock': ['read', 'adjust'],
  'broken-product': ['create', 'read'],
  'raw-material-stock': ['read', 'adjust'],

  purchase: ['create', 'read'],
  'purchase-payment': ['create', 'read'],
  delivery: ['create', 'read', 'dispatch', 'cancel'],

  invoice: ['create', 'read'],
  'customer-payment': ['create', 'read'],
  receipt: ['read', 'print'],
  expense: ['create', 'read'],
  salary: ['read'],

  dashboard: ['read'],
  report: ['read-operational'],
  notification: ['read'],
});

/**
 * Full Greenstone business access, shared by Admin and Super Admin.
 */
const fullBusinessAccess = {
  capability: ['grant', 'revoke', 'read'],
  settings: ['read', 'update'],
  'audit-log': ['read'],

  customer: ['create', 'read', 'update'],
  'customer-address': ['create', 'read', 'update'],
  product: ['create', 'read', 'update'],
  'measurement-unit': ['create', 'read', 'update'],
  'raw-material': ['create', 'read', 'update'],
  supplier: ['create', 'read', 'update'],
  employee: ['create', 'read', 'update'],
  driver: ['create', 'read', 'update'],
  vehicle: ['create', 'read', 'update'],

  order: ['create', 'read', 'update', 'cancel'],
  'customer-credit': ['read', 'set-opening-balance', 'override'],

  production: ['create', 'read', 'allocate'],
  curing: ['create', 'read', 'change-duration', 'release'],
  'finished-stock': ['read', 'set-opening', 'adjust'],
  'broken-product': ['create', 'read'],
  'raw-material-stock': ['read', 'set-opening', 'adjust'],

  purchase: ['create', 'read'],
  'purchase-payment': ['create', 'read', 'approve', 'reverse'],
  delivery: ['create', 'read', 'dispatch', 'cancel', 'correct'],

  invoice: ['create', 'read', 'void'],
  'customer-payment': ['create', 'read', 'approve', 'reverse'],
  receipt: ['read', 'print'],
  expense: ['create', 'read'],
  salary: ['register', 'read', 'approve', 'correct', 'reverse'],

  dashboard: ['read'],
  report: ['read-operational', 'read-financial'],
  notification: ['read'],
} as const;

/**
 * Admin.
 *
 * `adminAc.statements` supplies Better Auth's user and session management
 * permissions. Impersonation is not granted, because the feature is disabled.
 */
export const admin = ac.newRole({
  user: [
    'create',
    'list',
    'set-role',
    'ban',
    'delete',
    'set-password',
    'set-email',
    'get',
    'update',
  ],
  session: ['list', 'revoke', 'delete'],
  ...fullBusinessAccess,
});

/**
 * Super Admin. Full system access.
 */
export const superAdmin = ac.newRole({
  ...adminAc.statements,
  ...fullBusinessAccess,
});

export const roles = {
  super_admin: superAdmin,
  admin,
  accountant,
} as const;

export type GreenstoneRole = keyof typeof roles;

export const ROLE_NAMES = Object.keys(roles) as GreenstoneRole[];

/** Roles allowed to manage users through the Better Auth Admin plugin. */
export const ADMIN_ROLES: GreenstoneRole[] = ['super_admin', 'admin'];

export function isGreenstoneRole(value: unknown): value is GreenstoneRole {
  return typeof value === 'string' && ROLE_NAMES.includes(value as GreenstoneRole);
}
