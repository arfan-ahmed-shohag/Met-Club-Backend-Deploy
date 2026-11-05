import { randomUUID } from "node:crypto";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { Role } from "../../../../generated/prisma/enums";
import AppError from "../../errors/appErrors";
import auth from "../../middlewares/auth";
import { BlogController } from "./blog.controller";
import { validateCreateBlog } from "./blog.validation";

const router = express.Router();
const blogImageDir = path.join(process.cwd(), "uploads", "blogs");
fs.mkdirSync(blogImageDir, { recursive: true });

const imageExtensions: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const blogImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, blogImageDir),
    filename: (_req, file, callback) => callback(null, randomUUID() + (imageExtensions[file.mimetype] || ".img")),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!imageExtensions[file.mimetype]) {
      callback(new AppError(400, "Only PNG, JPEG, WEBP and GIF images are supported"));
      return;
    }
    callback(null, true);
  },
});

router.get("/", BlogController.getPublishedBlogPosts);
router.get("/mine", auth(Role.student), BlogController.getMyBlogPosts);
router.get("/admin", auth(Role.admin), BlogController.getAllBlogPostsForAdmin);
const uploadBlogImage = (req: Request, res: Response, next: NextFunction) => {
  blogImageUpload.single("image")(req, res, (error) => {
    if (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      const code = (error as { code?: string }).code;
      if (code === "LIMIT_FILE_SIZE") {
        next(new AppError(413, "Blog images must be 5 MB or smaller"));
        return;
      }
      if (code?.startsWith("LIMIT")) {
        next(new AppError(400, "Upload one image at a time"));
        return;
      }
      next(error);
      return;
    }
    BlogController.uploadBlogImage(req, res, next);
  });
};

router.post("/images", auth(Role.student, Role.admin), uploadBlogImage);
router.post("/", auth(Role.student, Role.admin), validateCreateBlog, BlogController.createBlogPost);
router.patch("/:id/publish", auth(Role.admin), BlogController.publishBlogPost);

export const BlogRoutes = router;