import { prisma } from "../../../lib/prisma";

const listHomeVideos = async (page: number, limit: number) => {
  const [items, total] = await prisma.$transaction([
    prisma.homeVideo.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.homeVideo.count(),
  ]);
  return { items, total };
};

const createHomeVideo = (input: { name: string; title: string; videoLink: string; thumbnailImage: string }) =>
  prisma.homeVideo.create({ data: input });

const updateHomeVideo = async (id: string, input: { name: string; title: string; videoLink: string; thumbnailImage?: string }) => {
  const current = await prisma.homeVideo.findUnique({ where: { id } });
  if (!current) return null;
  const video = await prisma.homeVideo.update({ where: { id }, data: input });
  return { video, previousThumbnail: input.thumbnailImage ? current.thumbnailImage : null };
};

const deleteHomeVideo = async (id: string) => {
  const current = await prisma.homeVideo.findUnique({ where: { id } });
  if (!current) return null;
  await prisma.homeVideo.delete({ where: { id } });
  return current;
};

export const HomeVideoService = { listHomeVideos, createHomeVideo, updateHomeVideo, deleteHomeVideo };
