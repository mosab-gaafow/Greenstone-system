/**
 * Audit-log input.
 *
 * Field list follows docs/technical-blueprint.md section 7.2.
 * Passwords, tokens and secrets must never appear in these values.
 */
export interface AuditLogInput {
  /** Null only for system actions that no user triggered. */
  userId?: string | null;
  /** Snapshot of the user's name at the time of the action. */
  userName?: string | null;
  /** Snapshot of the user's role at the time of the action. */
  userRole?: string | null;

  action: string;
  module: string;
  entityType: string;
  entityId?: string | null;

  /** Official document number, when the record has one. */
  documentNumber?: string | null;

  previousData?: unknown;
  updatedData?: unknown;

  /** Required for corrections, reversals and overrides. */
  reason?: string | null;

  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Context carried from the request into service calls so audit entries can
 * record who did what, from where.
 */
export interface AuditContext {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
