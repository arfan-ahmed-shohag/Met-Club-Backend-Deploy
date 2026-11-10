import type { Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";
import AppError from "../../errors/appErrors";
import { GalleryService } from "./gallery.service";

type UploadedFile = { filename: string };
type UploadRequest = Request & { file?: UploadedFile };
const galleryDirectory = path.join(process.cwd(), "uploads", "gallery");

async function removeImageFile(imageUrl?: string | null) {
  if (!imageUrl?.startsWith("/uploads/gallery/")) return;
  const filename = path.basename(imageUrl);
  try {
    await fs.unlink(path.join(galleryDirectory, filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

const listGalleryImages = catchAsync(async (req: Request, res: Response) => {
  const requestedPage = Number(req.query.page ?? 1);
  const requestedLimit = Number(req.query.limit ?? 9);
  if (!Number.isInteger(requestedPage) || requestedPage < 1 || !Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw new AppError(400, "Page and limit must be positive integers");
  }
  const page = requestedPage;
  const limit = Math.min(requestedLimit, 9);
  const { items, total } = await GalleryService.listGalleryImages(page, limit);
  sendResponse(res, {
    statusCode: 200,
    message: "Gallery images retrieved successfully.",
    meta: { page, limit, total },
    data: items,
  });
});

const createGalleryImage = catchAsync(async (req: UploadRequest, res: Response) => {
  if (!req.file) throw new AppError(400, "Choose an image to upload");
  const alt = typeof req.body.alt === "string" ? req.body.alt.trim() : "";
  if (alt.length > 200) {
    await removeImageFile(`/uploads/gallery/${req.file.filename}`);
    throw new AppError(400, "Image description must be 200 characters or fewer");
  }
  try {
    const result = await GalleryService.createGalleryImage(`/uploads/gallery/${req.file.filename}`, alt);
    sendResponse(res, { statusCode: 201, message: "Gallery image added successfully.", data: result });
  } catch (error) {
    await removeImageFile(`/uploads/gallery/${req.file.filename}`);
    throw error;
  }
});

const updateGalleryImage = catchAsync(async (req: UploadRequest, res: Response) => {
  const alt = typeof req.body.alt === "string" ? req.body.alt.trim() : undefined;
  if (alt !== undefined && alt.length > 200) {
    if (req.file) await removeImageFile(`/uploads/gallery/${req.file.filename}`);
    throw new AppError(400, "Image description must be 200 characters or fewer");
  }
  const result = await GalleryService.updateGalleryImage(req.params.id || "", {
    ...(req.file ? { imageUrl: `/uploads/gallery/${req.file.filename}` } : {}),
    ...(alt !== undefined ? { alt } : {}),
  });
  if (!result) {
    if (req.file) await removeImageFile(`/uploads/gallery/${req.file.filename}`);
    throw new AppError(404, "Gallery image not found");
  }
  if (result.previousImageUrl) await removeImageFile(result.previousImageUrl);
  sendResponse(res, { statusCode: 200, message: "Gallery image updated successfully.", data: result.image });
});

const deleteGalleryImage = catchAsync(async (req: Request, res: Response) => {
  const deleted = await GalleryService.deleteGalleryImage(req.params.id || "");
  if (!deleted) throw new AppError(404, "Gallery image not found");
  await removeImageFile(deleted.imageUrl);
  sendResponse(res, { statusCode: 200, message: "Gallery image deleted successfully.", data: deleted });
});

export const GalleryController = { listGalleryImages, createGalleryImage, updateGalleryImage, deleteGalleryImage };
