import { prisma } from "../../../lib/prisma";

const listStories = async (page: number, limit: number) => {
  const [items, total] = await prisma.$transaction([
    prisma.story.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.story.count(),
  ]);
  return { items, total };
};

type StoryInput = {
  quoteBn: string;
  quoteEn: string;
  authorNameBn: string;
  authorNameEn: string;
  authorDetailBn: string;
  authorDetailEn: string;
  imageUrl: string;
};

const createStory = (input: StoryInput) => prisma.story.create({ data: input });

const updateStory = async (
  id: string,
  input: Omit<StoryInput, "imageUrl"> & { imageUrl?: string },
) => {
  const current = await prisma.story.findUnique({ where: { id } });
  if (!current) return null;
  const story = await prisma.story.update({ where: { id }, data: input });
  return { story, previousImageUrl: input.imageUrl ? current.imageUrl : null };
};

const deleteStory = async (id: string) => {
  const current = await prisma.story.findUnique({ where: { id } });
  if (!current) return null;
  await prisma.story.delete({ where: { id } });
  return current;
};

export const StoryService = {
  listStories,
  createStory,
  updateStory,
  deleteStory,
};
