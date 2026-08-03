import { getStorageConfig } from '../../config/storage.js';
import { FileValidationError } from '../errors/app-error.js';
import { LocalStorageProvider } from './providers/local.provider.js';
import type { PutObjectInput, StorageProvider, StoredObject } from './storage.types.js';

/**
 * Storage entry point.
 *
 * Selects the configured provider and applies the file rules that apply
 * regardless of provider.
 */

let cachedProvider: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (!cachedProvider) {
    const config = getStorageConfig();

    switch (config.provider) {
      case 'local':
        cachedProvider = new LocalStorageProvider(config.localPath);
        break;
      default: {
        const exhaustive: never = config.provider;
        throw new Error(`Unsupported storage provider: ${String(exhaustive)}`);
      }
    }
  }

  return cachedProvider;
}

/** Clears the cached provider. Test-only. */
export function resetStorageProviderCache(): void {
  cachedProvider = undefined;
}

/**
 * Validates a file against the configured limits, then stores it.
 *
 * MIME type and size are checked here, backed by a real file-signature
 * (magic-byte) check — the phase that introduces the first real upload
 * endpoint (Phase 7D, purchase-payment evidence), which this comment
 * previously deferred to. A client-supplied `Content-Type` can be spoofed;
 * the leading bytes of the file itself cannot.
 */
export async function storeFile(input: PutObjectInput): Promise<StoredObject> {
  const config = getStorageConfig();

  if (input.content.byteLength === 0) {
    throw new FileValidationError('The file is empty.');
  }

  if (input.content.byteLength > config.maxFileSizeBytes) {
    const limitMb = Math.floor(config.maxFileSizeBytes / (1024 * 1024));
    throw new FileValidationError(`The file is larger than the ${limitMb} MB limit.`);
  }

  if (!config.allowedMimeTypes.includes(input.mimeType)) {
    throw new FileValidationError('This file type is not allowed.');
  }

  if (!matchesFileSignature(input.content, input.mimeType)) {
    throw new FileValidationError('The file content does not match its declared type.');
  }

  return getStorageProvider().put(input);
}

/**
 * Known magic-byte signatures for every currently-allowed MIME type. A type
 * with no known signature check here is trusted on declared MIME type alone
 * — every type this project currently allows (JPEG, PNG, WEBP, PDF) has one.
 */
const FILE_SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  'image/jpeg': (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes) =>
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a,
  'image/webp': (bytes) =>
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': (bytes) => bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-',
};

function matchesFileSignature(content: Buffer, mimeType: string): boolean {
  const check = FILE_SIGNATURES[mimeType];
  return check ? check(content) : true;
}
