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
 * MIME type and size are checked here. File-signature checking is added in the
 * phase that introduces uploads, together with the upload endpoint.
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

  return getStorageProvider().put(input);
}
