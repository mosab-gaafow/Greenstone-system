import type { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import type { AuditContext } from '../audit/audit.types.js';
import type { GreenstoneRole } from './permissions.js';

/**
 * Bridge between Express and the service layer.
 *
 * Services must not use Express request objects, but Better Auth server APIs
 * need the caller's headers to identify the session. Controllers convert the
 * request into the plain values below, and services work with those.
 */

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: GreenstoneRole;
  banned: boolean;
}

/**
 * Everything a service needs to act on behalf of the caller: who they are, and
 * the headers Better Auth requires to authorise privileged calls.
 */
export interface RequestContext {
  user: AuthenticatedUser;
  /** Plain Headers, safe to pass to Better Auth server APIs. */
  headers: Headers;
  requestId: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/** Converts Express headers into the Headers object Better Auth expects. */
export function toAuthHeaders(req: Request): Headers {
  return fromNodeHeaders(req.headers);
}

/**
 * Builds the audit context for a request, so audit rows carry a snapshot of who
 * performed the action.
 */
export function toAuditContext(context: RequestContext): AuditContext {
  return {
    userId: context.user.id,
    userName: context.user.name,
    userRole: context.user.role,
    requestId: context.requestId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}
