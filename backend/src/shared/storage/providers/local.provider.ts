import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FileValidationError, InternalServerError } from '../../errors/app-error.js';
import type { PutObjectInput, StorageProvider, StoredObject } from '../storage.types.js';

/**
 * Private local filesystem storage for development and test.
 *
 * Files live outside the public web directory and are only reachable through an
 * authenticated backend endpoint. This provider is not permanent production
 * storage.
 *
 * See docs/technical-blueprint.md sections 8.2 and 8.3.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';

  readonly #rootDirectory: string;

  constructor(rootDirectory: string) {
    this.#rootDirectory = path.resolve(rootDirectory);
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const storageKey = buildStorageKey(input.category, input.originalFileName);
    const absolutePath = this.#resolveKey(storageKey);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.content, { flag: 'wx' });

    return {
      storageKey,
      sizeBytes: input.content.byteLength,
      checksum: createHash('sha256').update(input.content).digest('hex'),
    };
  }

  async get(storageKey: string): Promise<Buffer> {
    return readFile(this.#resolveKey(storageKey));
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await access(this.#resolveKey(storageKey), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async remove(storageKey: string): Promise<void> {
    await rm(this.#resolveKey(storageKey), { force: true });
  }

  async healthCheck(): Promise<void> {
    try {
      await mkdir(this.#rootDirectory, { recursive: true });
      await access(this.#rootDirectory, constants.W_OK);
    } catch (error) {
      throw new InternalServerError('Local storage directory is not writable.', { cause: error });
    }
  }

  /**
   * Resolves a key to an absolute path, refusing anything that escapes the
   * storage root. Guards against path traversal in a stored key.
   */
  #resolveKey(storageKey: string): string {
    const absolutePath = path.resolve(this.#rootDirectory, storageKey);
    const rootWithSeparator = this.#rootDirectory.endsWith(path.sep)
      ? this.#rootDirectory
      : `${this.#rootDirectory}${path.sep}`;

    if (!absolutePath.startsWith(rootWithSeparator)) {
      throw new FileValidationError('Invalid storage key.');
    }

    return absolutePath;
  }
}

const SAFE_CATEGORY = /^[a-z0-9-]+$/;

/**
 * Builds a storage key that never trusts the uploaded file name.
 *
 * The original extension is kept only when it is short and alphanumeric, purely
 * so downloads open in the right application.
 */
function buildStorageKey(category: string, originalFileName: string): string {
  if (!SAFE_CATEGORY.test(category)) {
    throw new FileValidationError('Invalid storage category.');
  }

  const rawExtension = path.extname(originalFileName).slice(1).toLowerCase();
  const extension = /^[a-z0-9]{1,8}$/.test(rawExtension) ? `.${rawExtension}` : '';

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  return `${category}/${year}/${month}/${randomUUID()}${extension}`;
}
