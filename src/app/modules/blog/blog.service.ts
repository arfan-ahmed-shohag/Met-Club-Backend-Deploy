import { BlogStatus } from "../../../../generated/prisma/enums";
import AppError from "../../errors/appErrors";
import { prisma } from "../../../lib/prisma";

const authorSelection = {
  id: true,
  fullName: true,
  profileImg: true,
} as const;

const createBlogPost = async (authorEmail: string, input: { title: string; content: string; featuredImage: string | null }) => {
  return prisma.blogPost.create({
    data: {
      title: input.title,
      content: input.content,
      featuredImage: input.featuredImage,
      author: { connect: { email: authorEmail } },
    },
    include: { author: { select: authorSelection } },
  });
};

const getPublishedBlogPosts = async () => {
  return prisma.blogPost.findMany({
    where: { status: BlogStatus.published },
    orderBy: { publishedAt: "desc" },
    include: { author: { select: authorSelection } },
  });
};

const getBlogPostsByAuthor = async (authorEmail: string) => {
  return prisma.blogPost.findMany({
    where: { author: { email: authorEmail } },
    orderBy: { createdAt: "desc" },
    include: { author: { select: authorSelection } },
  });
};

const getAllBlogPostsForAdmin = async () => {
  return prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { ...authorSelection, email: true },
      },
    },
  });
};

const publishBlogPost = async (id: number) => {
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, "A valid blog post id is required");

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new AppError(404, "Blog post not found");
  if (post.status === BlogStatus.published) {
    return prisma.blogPost.findUniqueOrThrow({
      where: { id },
      include: { author: { select: { ...authorSelection, email: true } } },
    });
  }

  return prisma.blogPost.update({
    where: { id },
    data: { status: BlogStatus.published, publishedAt: new Date() },
    include: { author: { select: { ...authorSelection, email: true } } },
  });
};

export const BlogService = {
  createBlogPost,
  getPublishedBlogPosts,
  getBlogPostsByAuthor,
  getAllBlogPostsForAdmin,
  publishBlogPost,
};