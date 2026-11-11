CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "quoteBn" TEXT NOT NULL,
    "quoteEn" TEXT NOT NULL,
    "authorNameBn" TEXT NOT NULL,
    "authorNameEn" TEXT NOT NULL,
    "authorDetailBn" TEXT NOT NULL,
    "authorDetailEn" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Story_createdAt_idx" ON "Story"("createdAt");
