import { getEnv } from './env.js';

/**
 * Storage configuration derived from validated environment values.
 */
export interface StorageConfig {
  provider: 'local';
  localPath: string;
  maxFileSizeBytes: number;
  allowedMimeTypes: readonly string[];
}

export function getStorageConfig(): StorageConfig {
  const env = getEnv();

  return {
    provider: env.STORAGE_PROVIDER,
    localPath: env.STORAGE_LOCAL_PATH,
    maxFileSizeBytes: env.MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: env.allowedFileMimeTypes,
  };
}
