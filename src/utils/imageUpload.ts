import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import AppError from "../app/errors/appErrors";

const imageExtensions: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const uploadsRoot = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });

/** Unfiltered multer instance storing files in `uploads/` as `<timestamp>-<original name>`. */
export const rootUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadsRoot),
    filename: (_req, file, callback) =>
      callback(null, `${Date.now()}-${file.originalname}`),
  }),
});

type ImageUploadOptions = {
  /** Sub-folder of `uploads/` the file is stored in. */
  folder: string;
  /** Multipart field name holding the image. */
  field: string;
  /** Error message for an unsupported file type. */
  typeMessage: string;
  /** Error message for a file over 5 MB. */
  sizeMessage: string;
  /** Error message for any other multer limit (e.g. more than one file). */
  limitMessage: string;
};

/**
 * Express middleware that accepts one PNG/JPEG/WEBP/GIF image (max 5 MB) in
 * `field`, stores it under `uploads/<folder>` with a random name and maps
 * multer errors to `AppError`s.
 */
export const createImageUpload = ({
  folder,
  field,
  typeMessage,
  sizeMessage,
  limitMessage,
}: ImageUploadOptions) => {
  const directory = path.join(process.cwd(), "uploads", folder);
  fs.mkdirSync(directory, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, directory),
      filename: (_req, file, callback) =>
        callback(
          null,
          randomUUID() + (imageExtensions[file.mimetype] || ".img"),
        ),
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!imageExtensions[file.mimetype])
        return callback(new AppError(400, typeMessage));
      callback(null, true);
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(field)(req, res, (error) => {
      if (!error) return next();
      if (error instanceof AppError) return next(error);
      const code = (error as { code?: string }).code;
      if (code === "LIMIT_FILE_SIZE")
        return next(new AppError(413, sizeMessage));
      if (code?.startsWith("LIMIT"))
        return next(new AppError(400, limitMessage));
      next(error);
    });
  };
};
