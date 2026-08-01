import { CACHE_KEY_ROOT, CACHE_KEY_VERSION, getCacheConfig } from '../../config/cache.js';

/**
 * Cache key construction.
 *
 * Every key this application writes is built here, and nowhere else.
 *
 * Format:
 *
 *   greenstone:<version>:<environment>:<module>:<resource>:<identifier>
 *
 * for example
 *
 *   greenstone:v1:development:products:list:active
 *
 * The environment segment means one Redis instance can serve development, test
 * and production without their keys ever meeting. Without it, a test run that
 * cleared its keys would also clear development's.
 *
 * The version segment retires every key at once when a cached shape changes,
 * which is safer than trying to migrate values in place.
 */

export interface CacheKeyParts {
  /** Owning module, for example `products` or `dashboard`. */
  module: string;
  /** What is being cached, for example `list` or `detail`. */
  resource: string;
  /** Distinguishes one cached value from another within the resource. */
  identifier?: string;
}

/**
 * Segments must not contain the separator or whitespace, otherwise a value
 * could forge a key that collides with another module's namespace.
 */
const SAFE_SEGMENT = /^[A-Za-z0-9._@=&-]+$/;

function assertSafeSegment(name: string, value: string): void {
  if (!SAFE_SEGMENT.test(value)) {
    throw new Error(
      `Invalid cache key ${name}: "${value}". Use letters, digits, and . _ - @ = & only.`,
    );
  }
}

/** Builds a fully namespaced cache key. */
export function buildCacheKey(parts: CacheKeyParts): string {
  const { environment } = getCacheConfig();

  assertSafeSegment('module', parts.module);
  assertSafeSegment('resource', parts.resource);

  const segments = [CACHE_KEY_ROOT, CACHE_KEY_VERSION, environment, parts.module, parts.resource];

  if (parts.identifier !== undefined) {
    assertSafeSegment('identifier', parts.identifier);
    segments.push(parts.identifier);
  }

  return segments.join(':');
}

/**
 * Builds the prefix covering every key of a module, or of one resource within
 * it. Used to invalidate a group after a write.
 */
export function buildCacheKeyPrefix(module: string, resource?: string): string {
  const { environment } = getCacheConfig();

  assertSafeSegment('module', module);

  const segments = [CACHE_KEY_ROOT, CACHE_KEY_VERSION, environment, module];

  if (resource !== undefined) {
    assertSafeSegment('resource', resource);
    segments.push(resource);
  }

  return `${segments.join(':')}:`;
}

/**
 * Prefix covering every key this application owns in the current environment.
 * Test-only: used to clean up between tests.
 */
export function buildEnvironmentPrefix(): string {
  const { environment } = getCacheConfig();
  return `${CACHE_KEY_ROOT}:${CACHE_KEY_VERSION}:${environment}:`;
}
