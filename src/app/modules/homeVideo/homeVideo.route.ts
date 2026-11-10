import { randomUUID } from "node:crypto";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { Role } from "../../../../generated/prisma/enums";
import AppError from "../../errors/appErrors";
import auth from "../../middlewares/auth";
import { HomeVideoController } from "./homeVideo.controller";

const router = express.Router();
const videoDirectory = path.join(process.cwd(), "uploads", "videos");
fs.mkdirSync(videoDirectory, { recursive: true });
const extensions: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif" };

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, videoDirectory),
    filename: (_req, file, callback) => callback(null, randomUUID() + (extensions[file.mimetype] || ".img")),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!extensions[file.mimetype]) return callback(new AppError(400, "Only PNG, JPEG, WEBP and GIF thumbnails are supported"));
    callback(null, true);
  },
});

const handleThumbnailUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single("thumbnail")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof AppError) return next(error);
    const code = (error as { code?: string }).code;
    if (code === "LIMIT_FILE_SIZE") return next(new AppError(413, "Video thumbnails must be 5 MB or smaller"));
    if (code?.startsWith("LIMIT")) return next(new AppError(400, "Upload one thumbnail at a time"));
    next(error);
  });
};

router.get("/", HomeVideoController.listHomeVideos);
router.post("/", auth(Role.admin), handleThumbnailUpload, HomeVideoController.createHomeVideo);
router.patch("/:id", auth(Role.admin), handleThumbnailUpload, HomeVideoController.updateHomeVideo);
router.delete("/:id", auth(Role.admin), HomeVideoController.deleteHomeVideo);

export const HomeVideoRoutes = router;
