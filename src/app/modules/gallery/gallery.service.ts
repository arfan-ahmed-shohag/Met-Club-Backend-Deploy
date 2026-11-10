import { prisma } from "../../../lib/prisma";

const listGalleryImages = async (page: number, limit: number) => {
  const [items, total] = await prisma.$transaction([
    prisma.galleryImage.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.galleryImage.count(),
  ]);
  return { items, total };
};

const createGalleryImage = (imageUrl: string, alt: string) => prisma.galleryImage.create({ data: { imageUrl, alt } });

const updateGalleryImage = async (id: string, input: { imageUrl?: string; alt?: string }) => {
  const current = await prisma.galleryImage.findUnique({ where: { id } });
  if (!current) return null;
  const image = await prisma.galleryImage.update({ where: { id }, data: input });
  return { image, previousImageUrl: input.imageUrl ? current.imageUrl : null };
};

const deleteGalleryImage = async (id: string) => {
  const current = await prisma.galleryImage.findUnique({ where: { id } });
  if (!current) return null;
  await prisma.galleryImage.delete({ where: { id } });
  return current;
};

export const GalleryService = { listGalleryImages, createGalleryImage, updateGalleryImage, deleteGalleryImage };
