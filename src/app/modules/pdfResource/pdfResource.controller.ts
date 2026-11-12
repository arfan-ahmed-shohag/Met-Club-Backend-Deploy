import type { Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { PdfResourceCategory } from "../../../../generated/prisma/enums";
import { catchAsync } from "../../../utils/catchAsync";
import sendResponse from "../../../utils/responser";
import AppError from "../../errors/appErrors";
import { PdfResourceService } from "./pdfResource.service";

const pdfDirectory = path.join(process.cwd(), "uploads", "pdf-resources");
const imageDirectory = path.join(pdfDirectory, "images");
const validCategories = new Set<string>(Object.values(PdfResourceCategory));

function uploadedPdf(req: Request, field: string) {
  const files = req.files;
  if (!files || Array.isArray(files)) return undefined;
  return files[field]?.[0];
}

async function removePdf(pdfUrl?: string | null) {
  if (!pdfUrl?.startsWith("/uploads/pdf-resources/")) return;
  try {
    await fs.unlink(path.join(pdfDirectory, path.basename(pdfUrl)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function removeFeaturedImage(imageUrl?: string | null) {
  if (!imageUrl?.startsWith("/uploads/pdf-resources/images/")) return;
  try {
    await fs.unlink(path.join(imageDirectory, path.basename(imageUrl)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function removeNewUploads(
  files: Array<{ field: string; filename: string } | undefined>,
) {
  await Promise.all(
    files.map((file) =>
      file?.field === "featuredImage"
        ? removeFeaturedImage(`/uploads/pdf-resources/images/${file.filename}`)
        : file
          ? removePdf(`/uploads/pdf-resources/${file.filename}`)
          : Promise.resolve(),
    ),
  );
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readFields(body: Record<string, unknown>) {
  const category = readText(body.category);
  const titleBn = readText(body.titleBn);
  const titleEn = readText(body.titleEn);
  const descriptionBn = readText(body.descriptionBn);
  const descriptionEn = readText(body.descriptionEn);
  if (!validCategories.has(category))
    throw new AppError(400, "Choose a valid publication category");
  if (
    titleBn.length < 2 ||
    titleBn.length > 160 ||
    titleEn.length < 2 ||
    titleEn.length > 160
  )
    throw new AppError(400, "Both titles must contain 2 to 160 characters");
  if (
    descriptionBn.length < 2 ||
    descriptionBn.length > 500 ||
    descriptionEn.length < 2 ||
    descriptionEn.length > 500
  )
    throw new AppError(
      400,
      "Both descriptions must contain 2 to 500 characters",
    );
  return {
    category: category as PdfResourceCategory,
    titleBn,
    titleEn,
    descriptionBn,
    descriptionEn,
  };
}

const listPdfResources = catchAsync(async (req: Request, res: Response) => {
  const categoryValue = req.query.category;
  const categoryString = typeof categoryValue === "string" ? categoryValue : "";
  if (categoryString && !validCategories.has(categoryString))
    throw new AppError(400, "Choose a valid publication category");
  const page = Number(req.query.page ?? 1);
  const requestedLimit = Number(req.query.limit ?? 12);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 1
  )
    throw new AppError(400, "Page and limit must be positive integers");
  const limit = Math.min(requestedLimit, 50);
  const { items, total } = await PdfResourceService.listPdfResources(
    categoryString ? (categoryString as PdfResourceCategory) : undefined,
    page,
    limit,
  );
  sendResponse(res, {
    statusCode: 200,
    message: "PDF publications retrieved successfully.",
    meta: { page, limit, total },
    data: items,
  });
});

const createPdfResource = catchAsync(async (req: Request, res: Response) => {
  const pdfBn = uploadedPdf(req, "pdf");
  const pdfEn = uploadedPdf(req, "pdfEn");
  const featuredImage = uploadedPdf(req, "featuredImage");
  const uploaded = [
    pdfBn && { field: "pdf", filename: pdfBn.filename },
    pdfEn && { field: "pdfEn", filename: pdfEn.filename },
    featuredImage && {
      field: "featuredImage",
      filename: featuredImage.filename,
    },
  ];
  if (!pdfBn || !featuredImage) {
    await removeNewUploads(uploaded);
    throw new AppError(
      400,
      "Choose the Bengali PDF and a featured image to upload",
    );
  }
  if (featuredImage.size > 5 * 1024 * 1024) {
    await removeNewUploads(uploaded);
    throw new AppError(413, "Featured images must be 5 MB or smaller");
  }
  let fields: ReturnType<typeof readFields>;
  try {
    fields = readFields(req.body as Record<string, unknown>);
  } catch (error) {
    await removeNewUploads(uploaded);
    throw error;
  }
  try {
    const resource = await PdfResourceService.createPdfResource({
      ...fields,
      pdfUrl: `/uploads/pdf-resources/${pdfBn.filename}`,
      pdfUrlEn: pdfEn ? `/uploads/pdf-resources/${pdfEn.filename}` : null,
      featuredImageUrl: `/uploads/pdf-resources/images/${featuredImage.filename}`,
    });
    sendResponse(res, {
      statusCode: 201,
      message: "PDF publication added successfully.",
      data: resource,
    });
  } catch (error) {
    await removeNewUploads(uploaded);
    throw error;
  }
});

const updatePdfResource = catchAsync(async (req: Request, res: Response) => {
  const pdfBn = uploadedPdf(req, "pdf");
  const pdfEn = uploadedPdf(req, "pdfEn");
  const featuredImage = uploadedPdf(req, "featuredImage");
  const newFiles = [
    pdfBn && { field: "pdf", filename: pdfBn.filename },
    pdfEn && { field: "pdfEn", filename: pdfEn.filename },
    featuredImage && {
      field: "featuredImage",
      filename: featuredImage.filename,
    },
  ];
  if (featuredImage && featuredImage.size > 5 * 1024 * 1024) {
    await removeNewUploads(newFiles);
    throw new AppError(413, "Featured images must be 5 MB or smaller");
  }
  let fields: ReturnType<typeof readFields>;
  try {
    fields = readFields(req.body as Record<string, unknown>);
  } catch (error) {
    await removeNewUploads(newFiles);
    throw error;
  }
  const id = typeof req.params.id === "string" ? req.params.id : "";
  let result: Awaited<ReturnType<typeof PdfResourceService.updatePdfResource>>;
  try {
    result = await PdfResourceService.updatePdfResource(id, {
      ...fields,
      ...(pdfBn ? { pdfUrl: `/uploads/pdf-resources/${pdfBn.filename}` } : {}),
      ...(pdfEn
        ? { pdfUrlEn: `/uploads/pdf-resources/${pdfEn.filename}` }
        : {}),
      ...(featuredImage
        ? {
            featuredImageUrl: `/uploads/pdf-resources/images/${featuredImage.filename}`,
          }
        : {}),
    });
  } catch (error) {
    await removeNewUploads(newFiles);
    throw error;
  }
  if (!result) {
    await removeNewUploads(newFiles);
    throw new AppError(404, "PDF publication not found");
  }
  await Promise.all(result.previousPdfUrls.map((pdfUrl) => removePdf(pdfUrl)));
  await removeFeaturedImage(result.previousFeaturedImageUrl);
  sendResponse(res, {
    statusCode: 200,
    message: "PDF publication updated successfully.",
    data: result.resource,
  });
});

const deletePdfResource = catchAsync(async (req: Request, res: Response) => {
  const id = typeof req.params.id === "string" ? req.params.id : "";
  const resource = await PdfResourceService.deletePdfResource(id);
  if (!resource) throw new AppError(404, "PDF publication not found");
  await Promise.all([
    removePdf(resource.pdfUrl),
    removePdf(resource.pdfUrlEn),
    removeFeaturedImage(resource.featuredImageUrl),
  ]);
  sendResponse(res, {
    statusCode: 200,
    message: "PDF publication deleted successfully.",
    data: resource,
  });
});

export const PdfResourceController = {
  listPdfResources,
  createPdfResource,
  updatePdfResource,
  deletePdfResource,
};
