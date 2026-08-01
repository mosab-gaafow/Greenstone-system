import type { TransactionClient } from '../database/transaction.js';
import { runInTransaction } from '../database/transaction.js';
import { insertAuditLog } from './audit.repository.js';
import type { AuditContext, AuditLogInput } from './audit.types.js';

/**
 * Audit-log writer.
 *
 * Audit records are created by services, never by controllers or repositories.
 *
 * The write deliberately does not swallow errors. When an audit row cannot be
 * written, the surrounding transaction must fail so the business change does not
 * survive without its history.
 *
 * See docs/technical-blueprint.md sections 7.1 and 7.4.
 */

/**
 * Records an audit entry inside an existing transaction.
 *
 * This is the form services should use, so the business change and its audit row
 * commit together.
 */
export async function recordAudit(tx: TransactionClient, input: AuditLogInput): Promise<string> {
  return insertAuditLog(tx, input);
}

/**
 * Records an audit entry in its own transaction.
 *
 * Use only for actions with no accompanying business write, such as logging a
 * rejected sensitive request.
 */
export async function recordAuditStandalone(input: AuditLogInput): Promise<string> {
  return runInTransaction((tx) => insertAuditLog(tx, input));
}

/**
 * Merges request context into an audit entry, so callers only supply the fields
 * describing the action itself.
 */
export function withAuditContext(
  context: AuditContext,
  input: Omit<AuditLogInput, keyof AuditContext>,
): AuditLogInput {
  return {
    ...input,
    userId: context.userId ?? null,
    userName: context.userName ?? null,
    userRole: context.userRole ?? null,
    requestId: context.requestId ?? null,
    ipAddress: context.ipAddress ?? null,
    userAgent: context.userAgent ?? null,
  };
}
