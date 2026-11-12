import { randomUUID } from "node:crypto";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { Role } from "../../../../generated/prisma/enums";
import AppError from "../../errors/appErrors";
import auth from "../../middlewares/auth";
import { PdfResourceController } from "./pdfResource.controller";

const router = express.Router();
const pdfDirectory = path.join(process.cwd(), "uploads", "pdf-resources");
const imageDirectory = path.join(pdfDirectory, "images");
fs.mkdirSync(pdfDirectory, { recursive: true });
fs.mkdirSync(imageDirectory, { recursive: true });
const imageExtensions: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, file, callback) =>
      callback(
        null,
        file.fieldname === "featuredImage" ? imageDirectory : pdfDirectory,
      ),
    filename: (_req, file, callback) =>
      callback(
        null,
        `${randomUUID()}${file.fieldname === "featuredImage" ? imageExtensions[file.mimetype] || ".img" : ".pdf"}`,
      ),
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, callback) => {
    if (file.fieldname === "featuredImage")
      return imageExtensions[file.mimetype]
        ? callback(null, true)
        : callback(
            new AppError(400, "Use a PNG, JPEG, or WEBP featured image"),
          );
    return file.mimetype === "application/pdf"
      ? callback(null, true)
      : callback(new AppError(400, "Only PDF files are supported"));
  },
});

const handlePdfUpload = (req: Request, res: Response, next: NextFunction) =>
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "pdfEn", maxCount: 1 },
    { name: "featuredImage", maxCount: 1 },
  ])(req, res, (error) => {
    if (!error) return next();
    const uploadedFiles = req.files;
    if (uploadedFiles && !Array.isArray(uploadedFiles)) {
      Object.values(uploadedFiles)
        .flat()
        .forEach((file) => {
          try {
            fs.rmSync(file.path);
          } catch {
            /* ignore partial upload cleanup errors */
          }
        });
    }
    if (error instanceof AppError) return next(error);
    const code = (error as { code?: string }).code;
    if (code === "LIMIT_FILE_SIZE")
      return next(
        new AppError(
          413,
          "PDF files must be 20 MB or smaller; featured images must be 5 MB or smaller",
        ),
      );
    if (code?.startsWith("LIMIT"))
      return next(
        new AppError(
          400,
          "Upload at most one Bengali PDF, one English PDF, and one featured image",
        ),
      );
    next(error);
  });

router.get("/", PdfResourceController.listPdfResources);
router.post(
  "/",
  auth(Role.admin),
  handlePdfUpload,
  PdfResourceController.createPdfResource,
);
router.patch(
  "/:id",
  auth(Role.admin),
  handlePdfUpload,
  PdfResourceController.updatePdfResource,
);
router.delete(
  "/:id",
  auth(Role.admin),
  PdfResourceController.deletePdfResource,
);

export const PdfResourceRoutes = router;
