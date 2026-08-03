import multer, { MulterError } from 'multer';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getStorageConfig } from '../../config/storage.js';
import { FileValidationError } from '../errors/app-error.js';

/**
 * Single-file upload middleware, built on `multer`.
 *
 * Memory storage only: the file never touches disk under multer's control —
 * the buffer is handed to `shared/storage/storage.service.ts`'s `storeFile`,
 * which is the only thing allowed to decide where a file permanently lives.
 * MIME type and size are enforced here from the same validated config
 * `storeFile` itself uses, so a request is rejected before its body is even
 * fully buffered rather than after.
 *
 * This is a shared middleware **factory** — nothing here calls `app.use()`.
 * Each business route that accepts a file applies it individually, per
 * backend/CLAUDE.md's "do not create module-level middleware files" and the
 * explicit "do not register multer globally" instruction for Phase 7D.
 */
export function singleFileUpload(fieldName: string): RequestHandler {
  const config = getStorageConfig();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxFileSizeBytes, files: 1 },
    fileFilter(_req, file, callback) {
      if (!config.allowedMimeTypes.includes(file.mimetype)) {
        callback(new FileValidationError('This file type is not allowed.'));
        return;
      }
      callback(null, true);
    },
  }).single(fieldName);

  return (req: Request, res: Response, next: NextFunction): void => {
    upload(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          const limitMb = Math.floor(config.maxFileSizeBytes / (1024 * 1024));
          next(new FileValidationError(`The file is larger than the ${String(limitMb)} MB limit.`));
          return;
        }

        next(new FileValidationError('The file could not be uploaded.'));
        return;
      }

      // Already a FileValidationError from fileFilter, or an unrelated error.
      next(error);
    });
  };
}
