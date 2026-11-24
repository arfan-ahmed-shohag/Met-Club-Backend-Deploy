import { BlogStatus } from "../../../../generated/prisma/enums";
import AppError from "../../errors/appErrors";
import { prisma } from "../../../lib/prisma";
import {
  authorProfileSelect,
  toAuthor,
} from "../../../utils/publicUserSelect";

const authorSelection = {
  id: true,
  ...authorProfileSelect,
} as const;

// Replace the nested student/admin profile with flat author fields.
const withAuthor = <T extends { author: Parameters<typeof toAuthor>[0] }>(
  post: T,
) => ({ ...post, author: toAuthor(post.author) });

const createBlogPost = async (
  authorEmail: string,
  input: {
    title: string;
    titleEn: string;
    content: string;
    contentEn: string;
    featuredImage: string | null;
  },
) => {
  return prisma.blogPost.create({
    data: {
      title: input.title,
      titleEn: input.titleEn,
      content: input.content,
      contentEn: input.contentEn,
      featuredImage: input.featuredImage,
      author: { connect: { email: authorEmail } },
    },
    include: { author: { select: authorSelection } },
  }).then(withAuthor);
};

const getPublishedBlogPosts = async () => {
  return prisma.blogPost.findMany({
    where: { status: BlogStatus.published },
    orderBy: { publishedAt: "desc" },
    include: { author: { select: authorSelection } },
  }).then((posts) => posts.map(withAuthor));
};

const getBlogPostsByAuthor = async (authorEmail: string) => {
  return prisma.blogPost.findMany({
    where: { author: { email: authorEmail } },
    orderBy: { createdAt: "desc" },
    include: { author: { select: authorSelection } },
  }).then((posts) => posts.map(withAuthor));
};

const getAllBlogPostsForAdmin = async () => {
  return prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { ...authorSelection, email: true },
      },
    },
  }).then((posts) => posts.map(withAuthor));
};

const publishBlogPost = async (id: string) => {
  if (!id.trim()) throw new AppError(400, "A valid blog post id is required");

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new AppError(404, "Blog post not found");
  if (post.status === BlogStatus.published) {
    return prisma.blogPost.findUniqueOrThrow({
      where: { id },
      include: { author: { select: { ...authorSelection, email: true } } },
    }).then(withAuthor);
  }

  return prisma.blogPost.update({
    where: { id },
    data: { status: BlogStatus.published, publishedAt: new Date() },
    include: { author: { select: { ...authorSelection, email: true } } },
  }).then(withAuthor);
};

const unpublishBlogPost = async (id: string) => {
  if (!id.trim()) throw new AppError(400, "A valid blog post id is required");

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new AppError(404, "Blog post not found");
  if (post.status === BlogStatus.pending) {
    return prisma.blogPost.findUniqueOrThrow({
      where: { id },
      include: { author: { select: { ...authorSelection, email: true } } },
    }).then(withAuthor);
  }

  return prisma.blogPost.update({
    where: { id },
    data: { status: BlogStatus.pending, publishedAt: null },
    include: { author: { select: { ...authorSelection, email: true } } },
  }).then(withAuthor);
};

export const BlogService = {
  createBlogPost,
  getPublishedBlogPosts,
  getBlogPostsByAuthor,
  getAllBlogPostsForAdmin,
  publishBlogPost,
  unpublishBlogPost,
};
