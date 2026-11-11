CREATE TYPE "PdfResourceCategory" AS ENUM ('comics', 'flyer', 'pressRelease');

CREATE TABLE "PdfResource" (
    "id" TEXT NOT NULL,
    "category" "PdfResourceCategory" NOT NULL,
    "titleBn" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionBn" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PdfResource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PdfResource_category_createdAt_idx" ON "PdfResource"("category", "createdAt");

