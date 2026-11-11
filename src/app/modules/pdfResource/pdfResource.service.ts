import type { PdfResourceCategory } from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";

const listPdfResources = async (category: PdfResourceCategory | undefined, page: number, limit: number) => {
  const where = category ? { category } : {};
  const [items, total] = await prisma.$transaction([
    prisma.pdfResource.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.pdfResource.count({ where }),
  ]);
  return { items, total };
};

const createPdfResource = (input: { category: PdfResourceCategory; titleBn: string; titleEn: string; descriptionBn: string; descriptionEn: string; pdfUrl: string; pdfUrlEn?: string | null; featuredImageUrl: string }) =>
  prisma.pdfResource.create({ data: input });

const updatePdfResource = async (id: string, input: { category: PdfResourceCategory; titleBn: string; titleEn: string; descriptionBn: string; descriptionEn: string; pdfUrl?: string; pdfUrlEn?: string; featuredImageUrl?: string }) => {
  const current = await prisma.pdfResource.findUnique({ where: { id } });
  if (!current) return null;
  const resource = await prisma.pdfResource.update({ where: { id }, data: input });
  return { resource, previousPdfUrls: [input.pdfUrl ? current.pdfUrl : null, input.pdfUrlEn ? current.pdfUrlEn : null], previousFeaturedImageUrl: input.featuredImageUrl ? current.featuredImageUrl : null };
};

const deletePdfResource = async (id: string) => {
  const current = await prisma.pdfResource.findUnique({ where: { id } });
  if (!current) return null;
  await prisma.pdfResource.delete({ where: { id } });
  return current;
};

export const PdfResourceService = { listPdfResources, createPdfResource, updatePdfResource, deletePdfResource };
