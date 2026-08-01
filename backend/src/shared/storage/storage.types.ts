/**
 * File-storage port.
 *
 * Business modules depend on this interface, never on a concrete provider, so
 * development can use the local filesystem while production uses private
 * object storage.
 *
 * See docs/technical-blueprint.md section 8.2.
 */

export interface StoredObject {
  /** Generated key. Never derived from the uploaded file name. */
  storageKey: string;
  sizeBytes: number;
  /** SHA-256 of the stored bytes. */
  checksum: string;
}

export interface PutObjectInput {
  content: Buffer;
  mimeType: string;
  /** Logical grouping, for example `payment-evidence`. */
  category: string;
  /** Original name, kept for display only. Never used to build the key. */
  originalFileName: string;
}

export interface StorageProvider {
  readonly name: string;

  put(input: PutObjectInput): Promise<StoredObject>;
  get(storageKey: string): Promise<Buffer>;
  exists(storageKey: string): Promise<boolean>;

  /**
   * Removes an object.
   *
   * Permanent evidence must never be removed through normal application
   * actions. Callers are responsible for enforcing retention rules.
   */
  remove(storageKey: string): Promise<void>;

  /** Confirms the backing store is reachable and writable. */
  healthCheck(): Promise<void>;
}
