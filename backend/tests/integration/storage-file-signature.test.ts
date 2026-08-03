import { afterEach, describe, expect, it } from 'vitest';
import { resetStorageProviderCache, storeFile } from '../../src/shared/storage/storage.service.js';

/**
 * `storeFile`'s magic-byte signature check (Phase 7D) — a client-supplied
 * `Content-Type` can be spoofed; the leading bytes of the file itself
 * cannot. Covers every MIME type this project currently allows.
 */

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const PDF = Buffer.from('%PDF-1.4\n%âãÏÓ');
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
const NOT_A_REAL_FILE = Buffer.from('this is plain text, not any of the above');

describe('storeFile — file-signature validation', () => {
  afterEach(() => {
    resetStorageProviderCache();
  });

  it.each([
    ['image/jpeg', JPEG],
    ['image/png', PNG],
    ['application/pdf', PDF],
    ['image/webp', WEBP],
  ])('accepts a real %s file', async (mimeType, content) => {
    await expect(
      storeFile({ content, mimeType, category: 'test-signature', originalFileName: 'file' }),
    ).resolves.toMatchObject({ sizeBytes: content.byteLength });
  });

  it.each([
    ['image/jpeg', NOT_A_REAL_FILE],
    ['image/png', NOT_A_REAL_FILE],
    ['application/pdf', NOT_A_REAL_FILE],
  ])('rejects content that does not match its declared %s signature', async (mimeType, content) => {
    await expect(
      storeFile({ content, mimeType, category: 'test-signature', originalFileName: 'file' }),
    ).rejects.toThrow(/does not match/i);
  });

  it('rejects a disallowed MIME type before even checking its signature', async () => {
    await expect(
      storeFile({
        content: NOT_A_REAL_FILE,
        mimeType: 'application/x-msdownload',
        category: 'test-signature',
        originalFileName: 'file.exe',
      }),
    ).rejects.toThrow(/not allowed/i);
  });

  it('rejects an empty file', async () => {
    await expect(
      storeFile({
        content: Buffer.alloc(0),
        mimeType: 'image/jpeg',
        category: 'test-signature',
        originalFileName: 'empty.jpg',
      }),
    ).rejects.toThrow(/empty/i);
  });
});
