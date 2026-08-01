/**
 * Browser-safe configuration.
 *
 * Only values that are safe to expose publicly belong here. Secrets must never
 * use the NEXT_PUBLIC_ prefix.
 */

/**
 * Origin of the Express backend.
 *
 * In development the frontend runs on port 3000 and the backend on 4000, so an
 * absolute origin is needed.
 *
 * In production both sit behind one domain — Nginx routes `/api/v1` and
 * `/api/auth` to Express (see docs/technical-blueprint.md section 13.1) — so the
 * default is the empty string, meaning same-origin. Set the variable explicitly
 * if the backend is ever hosted separately.
 *
 * NEXT_PUBLIC_ values are inlined when the app is built, so this is decided at
 * build time, not at runtime.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000');

/** Greenstone business API base path. */
export const API_BASE_URL = `${BACKEND_URL}/api/v1`;

/** Better Auth base path. Better Auth appends its own routes to this. */
export const AUTH_BASE_URL = `${BACKEND_URL}/api/auth`;

export const LOGIN_PATH = '/login';
export const HOME_PATH = '/';

/**
 * Resolves a path that may be same-origin into something `new URL()` accepts.
 */
export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  return `${origin}${path}`;
}
