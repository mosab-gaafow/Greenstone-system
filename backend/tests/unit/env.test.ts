import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '4000',
  FRONTEND_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'mysql://user:pass@127.0.0.1:3306/greenstone_dev',
  CSRF_SECRET: 'a-secret-value-that-is-at-least-32-chars',
  BETTER_AUTH_SECRET: 'another-secret-value-at-least-32-chars',
  BETTER_AUTH_URL: 'http://localhost:4000',
} as NodeJS.ProcessEnv;

describe('environment validation', () => {
  it('accepts a valid environment and applies defaults', () => {
    const env = parseEnv(validEnv);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.STORAGE_PROVIDER).toBe('local');
    expect(env.PDF_RENDERER).toBe('playwright');
    expect(env.isProduction).toBe(false);
  });

  it('coerces the port to a number', () => {
    const env = parseEnv({ ...validEnv, PORT: '8080' });
    expect(env.PORT).toBe(8080);
  });

  it('splits the allowed MIME type list', () => {
    const env = parseEnv({
      ...validEnv,
      ALLOWED_FILE_MIME_TYPES: 'image/png, application/pdf ,',
    });

    expect(env.allowedFileMimeTypes).toEqual(['image/png', 'application/pdf']);
  });

  it('fails when a required variable is missing', () => {
    const { DATABASE_URL: _omitted, ...withoutDatabase } = validEnv;

    expect(() => parseEnv(withoutDatabase)).toThrow(/DATABASE_URL/);
  });

  it('fails when the CSRF secret is too short', () => {
    expect(() => parseEnv({ ...validEnv, CSRF_SECRET: 'short' })).toThrow(/CSRF_SECRET/);
  });

  it('fails when the frontend origin is not a URL', () => {
    expect(() => parseEnv({ ...validEnv, FRONTEND_ORIGIN: 'not-a-url' })).toThrow(
      /FRONTEND_ORIGIN/,
    );
  });

  it('fails when NODE_ENV is not one of the four environments', () => {
    expect(() => parseEnv({ ...validEnv, NODE_ENV: 'qa' })).toThrow(/NODE_ENV/);
  });

  it('reports every problem at once rather than only the first', () => {
    expect(() => parseEnv({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toThrow(
      /FRONTEND_ORIGIN[\s\S]*DATABASE_URL[\s\S]*CSRF_SECRET/,
    );
  });
});
