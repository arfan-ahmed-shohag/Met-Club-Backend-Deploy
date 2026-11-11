import type { Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";
import AppError from "../../errors/appErrors";
import { StoryService } from "./story.service";

type UploadedFile = { filename: string };
type UploadRequest = Request & { file?: UploadedFile };
const storyDirectory = path.join(process.cwd(), "uploads", "stories");

async function removeImage(imageUrl?: string | null) {
  if (!imageUrl?.startsWith("/uploads/stories/")) return;
  try {
    await fs.unlink(path.join(storyDirectory, path.basename(imageUrl)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function readFields(body: Request["body"]) {
  return {
    quoteBn: typeof body.quoteBn === "string" ? body.quoteBn.trim() : "",
    quoteEn: typeof body.quoteEn === "string" ? body.quoteEn.trim() : "",
    authorNameBn: typeof body.authorNameBn === "string" ? body.authorNameBn.trim() : "",
    authorNameEn: typeof body.authorNameEn === "string" ? body.authorNameEn.trim() : "",
    authorDetailBn: typeof body.authorDetailBn === "string" ? body.authorDetailBn.trim() : "",
    authorDetailEn: typeof body.authorDetailEn === "string" ? body.authorDetailEn.trim() : "",
  };
}

function validateFields(fields: ReturnType<typeof readFields>) {
  if (fields.quoteBn.length < 8 || fields.quoteBn.length > 1500 || fields.quoteEn.length < 8 || fields.quoteEn.length > 1500) {
    throw new AppError(400, "Story text must be 8 to 1500 characters in both languages");
  }
  if (fields.authorNameBn.length < 2 || fields.authorNameBn.length > 100 || fields.authorNameEn.length < 2 || fields.authorNameEn.length > 100) {
    throw new AppError(400, "Author names must be 2 to 100 characters in both languages");
  }
  if (fields.authorDetailBn.length > 160 || fields.authorDetailEn.length > 160) {
    throw new AppError(400, "Author details must be 160 characters or fewer");
  }
}

const listStories = catchAsync(async (req: Request, res: Response) => {
  const requestedPage = Number(req.query.page ?? 1);
  const requestedLimit = Number(req.query.limit ?? 9);
  if (!Number.isInteger(requestedPage) || requestedPage < 1 || !Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw new AppError(400, "Page and limit must be positive integers");
  }
  const page = requestedPage;
  const limit = Math.min(requestedLimit, 9);
  const { items, total } = await StoryService.listStories(page, limit);
  sendResponse(res, { statusCode: 200, message: "Stories retrieved successfully.", meta: { page, limit, total }, data: items });
});

const createStory = catchAsync(async (req: UploadRequest, res: Response) => {
  const fields = readFields(req.body);
  try {
    validateFields(fields);
    if (!req.file) throw new AppError(400, "A story image is required");
    const story = await StoryService.createStory({ ...fields, imageUrl: `/uploads/stories/${req.file.filename}` });
    sendResponse(res, { statusCode: 201, message: "Story added successfully.", data: story });
  } catch (error) {
    if (req.file) await removeImage(`/uploads/stories/${req.file.filename}`);
    throw error;
  }
});

const updateStory = catchAsync(async (req: UploadRequest, res: Response) => {
  const fields = readFields(req.body);
  let result: Awaited<ReturnType<typeof StoryService.updateStory>>;
  try {
    validateFields(fields);
    result = await StoryService.updateStory(req.params.id || "", {
      ...fields,
      ...(req.file ? { imageUrl: `/uploads/stories/${req.file.filename}` } : {}),
    });
  } catch (error) {
    if (req.file) await removeImage(`/uploads/stories/${req.file.filename}`);
    throw error;
  }

  if (!result) {
    if (req.file) await removeImage(`/uploads/stories/${req.file.filename}`);
    throw new AppError(404, "Story not found");
  }

  if (result.previousImageUrl) {
    try {
      await removeImage(result.previousImageUrl);
    } catch (error) {
      console.warn("Could not remove the replaced story image:", error);
    }
  }
  sendResponse(res, { statusCode: 200, message: "Story updated successfully.", data: result.story });
});

const deleteStory = catchAsync(async (req: Request, res: Response) => {
  const story = await StoryService.deleteStory(req.params.id || "");
  if (!story) throw new AppError(404, "Story not found");
  await removeImage(story.imageUrl);
  sendResponse(res, { statusCode: 200, message: "Story deleted successfully.", data: story });
});

export const StoryController = { listStories, createStory, updateStory, deleteStory };
