import type { Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";
import AppError from "../../errors/appErrors";
import { HomeVideoService } from "./homeVideo.service";

type UploadedFile = { filename: string };
type UploadRequest = Request & { file?: UploadedFile };
const videoDirectory = path.join(process.cwd(), "uploads", "videos");

function isYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be")
      && (host === "youtu.be" ? Boolean(url.pathname.slice(1)) : Boolean(url.searchParams.get("v") || url.pathname.match(/^\/(embed|shorts)\/[^/]+/)));
  } catch {
    return false;
  }
}

async function removeThumbnail(imageUrl?: string | null) {
  if (!imageUrl?.startsWith("/uploads/videos/")) return;
  try {
    await fs.unlink(path.join(videoDirectory, path.basename(imageUrl)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

const listHomeVideos = catchAsync(async (req: Request, res: Response) => {
  const requestedPage = Number(req.query.page ?? 1);
  const requestedLimit = Number(req.query.limit ?? 12);
  if (!Number.isInteger(requestedPage) || requestedPage < 1 || !Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw new AppError(400, "Page and limit must be positive integers");
  }
  const page = requestedPage;
  const limit = Math.min(requestedLimit, 12);
  const { items, total } = await HomeVideoService.listHomeVideos(page, limit);
  sendResponse(res, { statusCode: 200, message: "Home videos retrieved successfully.", meta: { page, limit, total }, data: items });
});

const createHomeVideo = catchAsync(async (req: UploadRequest, res: Response) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const videoLink = typeof req.body.videoLink === "string" ? req.body.videoLink.trim() : "";
  const thumbnailImage = req.file ? `/uploads/videos/${req.file.filename}` : "";
  if (!thumbnailImage) throw new AppError(400, "A thumbnail image is required");
  if (name.length < 2 || name.length > 120 || title.length < 2 || title.length > 200 || !isYouTubeUrl(videoLink)) {
    if (thumbnailImage) await removeThumbnail(thumbnailImage);
    throw new AppError(400, "Enter a valid name, title and YouTube video link");
  }
  try {
    const video = await HomeVideoService.createHomeVideo({ name, title, videoLink, thumbnailImage });
    sendResponse(res, { statusCode: 201, message: "Home video added successfully.", data: video });
  } catch (error) {
    if (thumbnailImage) await removeThumbnail(thumbnailImage);
    throw error;
  }
});

const updateHomeVideo = catchAsync(async (req: UploadRequest, res: Response) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const videoLink = typeof req.body.videoLink === "string" ? req.body.videoLink.trim() : "";
  const thumbnailImage = req.file ? `/uploads/videos/${req.file.filename}` : "";
  if (name.length < 2 || name.length > 120 || title.length < 2 || title.length > 200 || !isYouTubeUrl(videoLink)) {
    if (thumbnailImage) await removeThumbnail(thumbnailImage);
    throw new AppError(400, "Enter a valid name, title and YouTube video link");
  }
  let result: Awaited<ReturnType<typeof HomeVideoService.updateHomeVideo>>;
  try {
    result = await HomeVideoService.updateHomeVideo(req.params.id || "", { name, title, videoLink, ...(thumbnailImage ? { thumbnailImage } : {}) });
  } catch (error) {
    if (thumbnailImage) await removeThumbnail(thumbnailImage);
    throw error;
  }
  if (!result) {
    if (thumbnailImage) await removeThumbnail(thumbnailImage);
    throw new AppError(404, "Home video not found");
  }
  if (result.previousThumbnail) await removeThumbnail(result.previousThumbnail);
  sendResponse(res, { statusCode: 200, message: "Home video updated successfully.", data: result.video });
});

const deleteHomeVideo = catchAsync(async (req: Request, res: Response) => {
  const video = await HomeVideoService.deleteHomeVideo(req.params.id || "");
  if (!video) throw new AppError(404, "Home video not found");
  await removeThumbnail(video.thumbnailImage);
  sendResponse(res, { statusCode: 200, message: "Home video deleted successfully.", data: video });
});

export const HomeVideoController = { listHomeVideos, createHomeVideo, updateHomeVideo, deleteHomeVideo };
