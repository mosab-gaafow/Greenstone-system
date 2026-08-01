import { API_BASE_URL, LOGIN_PATH, absoluteUrl } from './config';

/**
 * Central API client for Greenstone business endpoints.
 *
 * Every request to `/api/v1` goes through here. Do not scatter `fetch` calls
 * across components.
 *
 * Responsibilities:
 * - Send the session cookie with every request.
 * - Attach a CSRF token to state-changing requests.
 * - Turn the standard error envelope into a typed error.
 * - Send the user to the login page when the session is gone.
 *
 * There is no token-refresh logic here, and there must never be. Better Auth
 * uses database-backed sessions; there are no refresh tokens to rotate.
 */

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]> | undefined;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors;
  }
}

interface SuccessEnvelope<TData> {
  success: true;
  data: TData;
  meta?: Record<string, unknown>;
  requestId: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface Paginated<TItem> {
  items: TItem[];
  meta: PaginationMeta;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'X-CSRF-Token';

/**
 * Cached CSRF token.
 *
 * The token is tied to the current session, so it is cleared whenever the
 * session ends. A single in-flight promise prevents a burst of mutations from
 * each requesting their own token.
 */
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(absoluteUrl(`${API_BASE_URL}/csrf-token`), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Could not obtain a CSRF token.');
  }

  const body = (await response.json()) as SuccessEnvelope<{ csrfToken: string }>;
  return body.data.csrfToken;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  csrfRequest ??= fetchCsrfToken()
    .then((token) => {
      csrfToken = token;
      return token;
    })
    .finally(() => {
      csrfRequest = null;
    });

  return csrfRequest;
}

/** Clears the cached token. Call when the session ends. */
export function clearCsrfToken(): void {
  csrfToken = null;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export async function apiRequest<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: TData; meta?: Record<string, unknown> }> {
  const method = options.method ?? 'GET';
  const url = new URL(absoluteUrl(`${API_BASE_URL}${path}`));

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!SAFE_METHODS.has(method)) {
    headers[CSRF_HEADER] = await getCsrfToken();
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  if (response.status === 204) {
    return { data: undefined as TData };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = extractError(payload, response.status);

    if (response.status === 401) {
      handleSessionLost();
    }

    // A rejected CSRF token is usually a stale one. Drop it so the next
    // attempt fetches a fresh token rather than failing the same way.
    if (response.status === 403 && error.code === 'PERMISSION_DENIED') {
      clearCsrfToken();
    }

    throw new ApiError(response.status, error);
  }

  const envelope = payload as SuccessEnvelope<TData>;
  return envelope.meta === undefined
    ? { data: envelope.data }
    : { data: envelope.data, meta: envelope.meta };
}

function extractError(payload: unknown, status: number): ApiErrorBody {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof (payload as { error: unknown }).error === 'object'
  ) {
    return (payload as { error: ApiErrorBody }).error;
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: `The request failed with status ${status}.`,
  };
}

/**
 * Sends the user back to the login page after the session ends.
 *
 * A full navigation is deliberate: it clears all cached client state, so no
 * data from the previous session can linger on screen.
 */
function handleSessionLost(): void {
  clearCsrfToken();

  if (typeof window === 'undefined' || window.location.pathname === LOGIN_PATH) {
    return;
  }

  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`${LOGIN_PATH}?expired=1&next=${next}`);
}

export const api = {
  get: <TData>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<TData>(path, { ...options, method: 'GET' }),
  post: <TData>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<TData>(path, { ...options, method: 'POST', body }),
  patch: <TData>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<TData>(path, { ...options, method: 'PATCH', body }),
  delete: <TData>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => apiRequest<TData>(path, { ...options, method: 'DELETE', body }),
};
