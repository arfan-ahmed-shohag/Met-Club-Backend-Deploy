import type { Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";
import AppError from "../../errors/appErrors";
import { BlogService } from "./blog.service";

type AuthenticatedRequest = Request & { user?: JwtPayload };
type ImageUploadRequest = Request & { file?: { filename: string } };

function getAuthenticatedEmail(req: Request) {
  const email = (req as AuthenticatedRequest).user?.email;
  if (typeof email !== "string") throw new AppError(401, "Unauthorized");
  return email;
}

const uploadBlogImage = catchAsync(async (req: ImageUploadRequest, res: Response) => {
  if (!req.file) throw new AppError(400, "Choose a supported image to upload");
  sendResponse(res, {
    statusCode: 201,
    message: "Blog image uploaded successfully.",
    data: { url: "/uploads/blogs/" + req.file.filename },
  });
});

const createBlogPost = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.createBlogPost(getAuthenticatedEmail(req), req.body);
  sendResponse(res, {
    statusCode: 201,
    message: "Blog submitted for admin review.",
    data: result,
  });
});

const getPublishedBlogPosts = catchAsync(async (_req: Request, res: Response) => {
  const result = await BlogService.getPublishedBlogPosts();
  sendResponse(res, {
    statusCode: 200,
    message: "Published blog posts retrieved successfully.",
    data: result,
  });
});

const getMyBlogPosts = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.getBlogPostsByAuthor(getAuthenticatedEmail(req));
  sendResponse(res, {
    statusCode: 200,
    message: "Your blog submissions retrieved successfully.",
    data: result,
  });
});

const getAllBlogPostsForAdmin = catchAsync(async (_req: Request, res: Response) => {
  const result = await BlogService.getAllBlogPostsForAdmin();
  sendResponse(res, {
    statusCode: 200,
    message: "Blog submissions retrieved successfully.",
    data: result,
  });
});

const publishBlogPost = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.publishBlogPost(Number(req.params.id));
  sendResponse(res, {
    statusCode: 200,
    message: "Blog post published successfully.",
    data: result,
  });
});

export const BlogController = {
  uploadBlogImage,
  createBlogPost,
  getPublishedBlogPosts,
  getMyBlogPosts,
  getAllBlogPostsForAdmin,
  publishBlogPost,
};