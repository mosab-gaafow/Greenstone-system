import type { CookieOptions } from 'express';
import { getEnv } from './env.js';

/**
 * Security configuration derived from validated environment values.
 *
 * See docs/technical-blueprint.md sections 6.1 and 6.4.
 */

export interface CorsConfig {
  origin: string;
  credentials: true;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
}

export function getCorsConfig(): CorsConfig {
  return {
    origin: getEnv().FRONTEND_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  };
}

/**
 * Base cookie options for every cookie this API sets.
 *
 * `secure` follows the environment so local HTTP development works while
 * production stays HTTPS-only.
 */
export function getBaseCookieOptions(): CookieOptions {
  const env = getEnv();

  return {
    httpOnly: true,
    secure: env.isProduction || env.NODE_ENV === 'staging',
    sameSite: 'strict',
    path: '/',
  };
}

export const CSRF_COOKIE_NAME = 'greenstone.csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function getRateLimitConfig(): { windowMs: number; max: number } {
  const env = getEnv();
  return { windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX };
}
