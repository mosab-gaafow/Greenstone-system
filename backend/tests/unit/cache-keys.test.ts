import { describe, expect, it } from 'vitest';
import {
  buildCacheKey,
  buildCacheKeyPrefix,
  buildEnvironmentPrefix,
} from '../../src/shared/cache/cache-keys.js';
import { CACHE_KEY_VERSION } from '../../src/config/cache.js';

/**
 * Key format, asserted exactly.
 *
 * The approved format is:
 *
 *   greenstone:v1:<environment>:<module>:<resource>:<identifier>
 */

describe('cache keys', () => {
  it('builds the approved format', () => {
    expect(buildCacheKey({ module: 'products', resource: 'list', identifier: 'active' })).toBe(
      'greenstone:v1:test:products:list:active',
    );
  });

  it('omits the identifier when there is none', () => {
    expect(buildCacheKey({ module: 'dashboard', resource: 'summary' })).toBe(
      'greenstone:v1:test:dashboard:summary',
    );
  });

  it('namespaces by environment so environments never share keys', () => {
    // The suite runs with NODE_ENV=test, so a development key can never be
    // read or cleared by a test run.
    expect(buildCacheKey({ module: 'products', resource: 'list' })).toContain(':test:');
  });

  it('carries the version segment', () => {
    expect(buildCacheKey({ module: 'products', resource: 'list' })).toContain(
      `:${CACHE_KEY_VERSION}:`,
    );
  });

  it('builds a module prefix', () => {
    expect(buildCacheKeyPrefix('products')).toBe('greenstone:v1:test:products:');
  });

  it('builds a resource prefix', () => {
    expect(buildCacheKeyPrefix('products', 'list')).toBe('greenstone:v1:test:products:list:');
  });

  it('builds the environment prefix', () => {
    expect(buildEnvironmentPrefix()).toBe('greenstone:v1:test:');
  });

  it('rejects a segment containing the separator', () => {
    // Without this, a value could forge a key inside another module's
    // namespace.
    expect(() => buildCacheKey({ module: 'products:evil', resource: 'list' })).toThrow(
      /Invalid cache key/,
    );
    expect(() =>
      buildCacheKey({ module: 'products', resource: 'list', identifier: 'a:b' }),
    ).toThrow(/Invalid cache key/);
  });

  it('rejects a segment containing whitespace', () => {
    expect(() => buildCacheKey({ module: 'pro ducts', resource: 'list' })).toThrow(
      /Invalid cache key/,
    );
  });

  it('allows the characters a query filter needs', () => {
    expect(
      buildCacheKey({ module: 'products', resource: 'list', identifier: 'page=1&size=25' }),
    ).toBe('greenstone:v1:test:products:list:page=1&size=25');
  });
});
